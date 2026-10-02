# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

After implementing changes: `yarn build && yalc push` (from `packages/csm-sdk`) to update the package in dependent projects.

## Architecture

The SDK centers on `LidoSDKCsm`, `LidoSDKCm` and `LidoSDKCsm02` (all extending `StakingModuleSDK`), each aggregating per-module `*-sdk` classes, plus `LidoSmSDK`, a registry over every module deployed on the chain. Each module dir follows `{module-name}-sdk.ts` / `types.ts` / `index.ts`.

### BusRegistry

Modules talk via a shared Proxy-based `BusRegistry` (`bus.moduleName.method()`), created once by `StakingModuleSDK` and passed via `commonProps`. A module declares the peers it expects via the `CsmSDKModule<{...}>` generic; this is **not** checked against what is actually registered — a missing registration surfaces as `undefined` at runtime. Mark peers that may be absent optional (`keysWithStatus?: KeysWithStatusSDK`) and use `?.`.

### Decorator Order Convention

**Standard order (outermost to innermost):** `@Access → @Logger → @ErrorHandler → @Cache | @Dedupe`

**Every transaction method (with `tx.perform`) must have `@Access`** — it declares who can call the method, enabling frontend permission checks via `getMethodAccess()` and `resolveAccess()`.

Transaction methods (with `@Access`):

```typescript
@Access({ level: AccessLevel.MANAGER })  // Outermost - metadata only, no wrapping
@Logger('Call:')
@ErrorHandler()
public async compensateLockedBond(props: CompensateLockedBondProps)
```

View methods (without `@Access`):

```typescript
@Logger('Views:')      // Outermost - logs all calls (including cache hits)
@ErrorHandler()        // Middle - catches and transforms errors
@Dedupe()              // Innermost - shares concurrent calls (or @Cache(ttl) to store results)
public async getInfo(id: NodeOperatorId): Promise<NodeOperatorInfo>
```

Async view methods over mutable on-chain state use `@Dedupe()` in place of `@Cache` (innermost, same position).

**Choosing a tier for a new view method:**

| Kind | Decorator |
|------|-----------|
| Immutable (constants, per-module fixed values, CID-keyed trees) | `@Cache(CACHE_IMMUTABLE)` |
| Governance-mutable config (curves, frame config) | `@Cache(CACHE_LONG)` (1 h) |
| External API / wallet detection | `@Cache(CACHE_SHORT)` (10 s) |
| Mutable on-chain state | `@Dedupe()` (concurrent calls share one promise, nothing kept after settle) |

The SDK does not cache mutable on-chain state; consumers own freshness. There is no cache invalidation API.

**Why this order:**

- Decorators execute **bottom-to-top** (innermost first)
- `@Access` is metadata-only (stores Symbol on function, no wrapping) — outermost so the Symbol attaches to the final wrapped function
- Logger tracks all calls for debugging/monitoring (executes first)
- ErrorHandler catches errors from both cache and method execution
- Cache only stores successful results (uses `.then()` without `.catch()`)
- Errors are never cached regardless of decorator order

### Access Permission Metadata

`@Access(...)` is metadata-only — contracts enforce permissions on-chain; the decorator enables frontend UX (disable buttons, show warnings). `resolveAccess(access, ctx)` is a pure function (no RPC); the consumer pre-fetches operator info.

| Level | Who can call |
|-------|-------------|
| `ANYONE` | No restriction |
| `MANAGER` | Operator's manager address |
| `REWARDS` | Operator's reward address |
| `OWNER` | Manager if `extendedManagerPermissions`, reward address otherwise |
| `PROPOSED_MANAGER` | Address proposed as the new manager (two-phase change) |
| `PROPOSED_REWARDS` | Address proposed as the new reward address (two-phase change) |
| `CLAIMER` | Manager, reward address, or custom rewards claimer |
| `PROTOCOL_ROLE` | OpenZeppelin AccessControl role (system-level, not per-operator) |

Some methods have **conditions**: e.g. `changeRewardsAddress` requires `extendedManagerPermissions: true`.

### Error Handling (SDKError)

Every error thrown by the SDK is an `SDKError` (`code` always set, `decodedRevert` iff a revert selector decoded, `cause` = original viem error). `classifyError()` (`common/utils/classify-error.ts`) maps viem error classes to `ERROR_CODE`; the classifier wins over any caller-supplied `code` because viem class detection is strictly more specific than a context hint (e.g. `TRANSACTION_ERROR`).

Most codes are class-based and spec-stable. `WALLET_TIMEOUT`, `AA_VALIDATION_ERROR`, and `AA_PAYMASTER_ERROR` are the exceptions — they regex-match message text because the EIP they classify against has no dedicated machine-readable code. `AA_*` lean on the ERC-4337 `AAxx` revert-string convention rather than wallet-vendor wording, but all three are best-effort and silently fall through to their generic sibling bucket for non-conforming wording.

`DECODE_RESULT_ERROR` means the tx was mined and confirmed but the `decodeResult` callback threw — the tx **succeeded on-chain**; `cause` is a `DecodeResultError` carrying `hash` + `receipt` + `confirmations`.

### Contract References (External Repositories)

**staking-modules** (main CSM + Curated Module contracts; formerly `community-staking-module`):

- Sources: `staking-modules/src`
- ABI: `staking-modules/out`
- Deployed addresses (split into `csm/` and `curated/` subdirs per network):
  - Mainnet CSM: `staking-modules/artifacts/mainnet/csm/deploy-mainnet.json`
  - Mainnet CM: `staking-modules/artifacts/mainnet/curated/deploy-mainnet.json`
  - Hoodi CSM: `staking-modules/artifacts/hoodi/csm/deploy-hoodi.json`
  - Hoodi CM: `staking-modules/artifacts/hoodi/curated/deploy-hoodi.json`

**sm-discovery** (discovery contracts; formerly `csm-satellite`):

- Sources: `sm-discovery/src`
- ABI: `sm-discovery/out`
- Deployed addresses: `sm-discovery/artifacts/<network>/transactions.json`

`SMDiscovery` sits behind an `OssifiableProxy` — the SDK must hold the **proxy** address; the
implementation rotates on every upgrade. Reads revert with `ModuleCacheNotInitialized` until
`updateModuleCache(moduleId)` has been called for that module.

### Contract Ownership

`CoreSDK` exposes `contract*` getters only for high-reuse infrastructure contracts (module, accounting, fee distributor/oracle, parameters registry, staking router, SMDiscovery, …). Module-specific and single-use contracts are owned by the module that uses them, via `this.core.getContract(CONTRACT_NAMES.x)` in a private getter — don't add new ones to `CoreSDK`.

### Module Composition

| Module Category | CSM | CSM_02 | CM | Notes |
|----------------|-----|--------|----|----|
| Core & Infrastructure | ✅ | ✅ | ✅ | tx, core, module, accounting, parameters, frame |
| Operator Management | ✅ | ✅ | ✅ | operator, keys, keysWithStatus, keysCache, bond |
| Data & Events | ✅ | ✅ | ✅ | events, depositData, discovery, feesMonitoring |
| Deposit Queue | ✅ | ✅ (+ top-up) | ❌ | depositQueue; profile flags `depositQueue` / `topUpQueue` |
| Rewards | ✅ | ✅ | ✅ | rewards |
| Roles | RolesSDK | RolesSDK | CuratedRolesSDK | CM uses extended variant |
| Strikes | ✅ | ✅ | ❌ | strikes |
| Delayed Penalties | ✅ | ✅ | ✅ | delayedPenalty |
| Entry Gates | permissionlessGate, icsGate, idvtcGate | permissionlessGate | curatedGates | Different entry mechanisms |
| Metadata | ❌ | ❌ | ✅ | CM-only: metaRegistry |

Module IDs: CSM mainnet 3 / hoodi 4; CM mainnet 4 / hoodi 5; CSM_02 hoodi 6 (not on mainnet yet).

#### Contract Addresses

Contract addresses are selected by module and chain in `common/constants/module-config.ts`:
- **Per-module**: `MODULE_CONFIG[MODULE_NAME][chainId]` (module contract, accounting, feeDistributor, gates, …); a missing chain entry makes the constructor throw `NOT_SUPPORTED`
- **Common**: `COMMON_ADDRESSES[chainId]` (stakingRouter, stETH, wstETH, SMDiscovery, …)
- `resolveDeployment({ moduleName, chainId, overridedAddresses })` (`core-sdk/resolve-deployment.ts`) is the single pure resolver (no `LidoSDKCore`): addresses, `moduleId`, `deploymentBlockNumber`, `profile`; throws `NOT_SUPPORTED` if undeployed. `getContractAddresses` is its `.contractAddresses` projection; `resolveChainAddresses` gives chain-wide contracts (common + flat overrides) and feeds `AllowanceSDK`
- `SdkProps.overridedAddresses` is merged over both. Precedence: common < module config < flat overrides < per-module overrides; explicit `undefined` values mean unset. Flat stETH/wstETH also apply to allowance/approve (tokens are chain-wide; per-module stETH/wstETH is a type error)
  ```ts
  overridedAddresses: { stETH: '0x..', [MODULE_NAME.CSM]: { accounting: '0x..' } }  // accounting override hits CSM only
  ```

### Per-module profile

`MODULE_PROFILE` (`common/constants/module-profile.ts`) is the single table of per-module, per-chain facts: `moduleContract`, `depositQueue`, `topUpQueue`, `allocatedBalance`, `contractVersions`, `merkleTreeFallbacks`, `reportV1LogCids`, typed as `PerModule<ModuleProfileConfig>`. `resolveModuleProfile(moduleName, chainId)` narrows one entry to a single chain (`merkleTreeFallbacks`/`reportV1LogCids` become plain, non-optional values), producing a `ModuleProfile`. `CoreSDK` resolves this once in its constructor and exposes it as `this.core.profile`.

### Multi-module usage

`LidoSmSDK` registers every module deployed on the connected chain behind one entry point:

```ts
const sm = new LidoSmSDK({ core });          // every module deployed on core.chain
sm.csm?.strikes; sm.get(MODULE_NAME.CM)?.metaRegistry;
sm.require(MODULE_NAME.CSM_02);              // throws NOT_SUPPORTED if absent
await sm.discovery.getNodeOperatorsByAddress(addr);   // [{ module, operator }]
```

`getDeployedModules(chainId)` (`common/constants/module-config.ts`) / `SUPPORTED_MODULES` (`common/constants/module-name.ts`) give the canonical module order. `sm.discovery` returns partial results when some modules fail (`{ onModuleError }` option reports each), rejecting with the first error only if all modules fail.

Sharing rule: `wallet`, `allowance`, `keysCache` are one instance across modules; everything reading a module address stays per-module. `createSharedServices(props)` (`sm-sdk/shared-services.ts`) builds this triple; both `LidoSmSDK` and `StakingModuleSDK` (when no `shared` is passed) call it. `KeysCacheSDK` is chain-scoped like `WalletSDK`/`AllowanceSDK` — not a `CsmSDKModule`.

### Transaction System (tx-sdk)

`tx.perform()` detects the wallet type and routes: EOA → permit signature + tx; multisig → approve tx + main tx; Abstract Account → EIP-5792 `sendCalls` batch.

- Encode calls with viem's `contract.encode.method([args])` (payable: `contract.encode.method([args], { value })`) — the former `prepCall` helper was removed.
- `decodeResult` runs **after** the tx is mined and confirmed. If it throws, `tx.perform` rejects with `DECODE_RESULT_ERROR` — the tx still succeeded on-chain.

### Keys Cache

Pubkeys enter the cache only via the tx callbacks of the add-keys / create-operator flows; `depositData.validateDepositData` only reads it for duplicates. TTL is 2 weeks, timestamp-based; storage is per-chain localStorage (`lido-keys-cache-${chainId}`).

### Testing

Two Vitest projects share `packages/csm-sdk/vitest.config.ts`:

- **`unit`** — `tests/unit/**/*.test.ts`. Pure logic only. Run with `yarn test`.
- **`integration`** — `tests/integration/**/*.test.ts`. Anvil-backed SDK calls against a hoodi fork. Run with `yarn test:integration`. Requires `.env` (see `.env.example`).
- `yarn test:all` runs both. Tests use explicit imports from `vitest` (no globals).

**Fixtures (`tests/helpers/`)** follow a cached `use*()` pattern: `useCsmSdk()`, `useCmSdk()`, `useWalletClient()`, `useTestClient()`, `useAccount()`, `useAltAccount()`. Each helper memoizes and returns the same instance per test process. See `packages/csm-sdk/tests/README.md` for the full guide.

**File naming convention**: `tests/integration/*-wallet.test.ts` for tests that sign + broadcast; plain `tests/integration/*.test.ts` for read-only SDK calls. Mirrors lido-ethereum-sdk's separation.

**Snapshot tests**: `tests/unit/access-coverage.test.ts` pins the `@Access` annotation across every SDK module — any accidental annotation loss becomes a visible snapshot diff in PR review. Refresh deliberately with `yarn test -u` when changing access levels.

**AA testing strategy**: see `tests/README.md` § AA. Unit-level capability mocking covers TxSDK routing; the integration test exercises routing + callback contract + receipt handling by faking `getCapabilities` (atomic: supported) and relying on viem's `experimental_fallback`. How the batch lands on-chain is **anvil-version dependent**: newer anvil implements `wallet_sendCalls` and runs the batch atomically (nonce +1), while older anvil makes the fallback fan out to sequential `eth_sendTransaction` (nonce +2). The AA test therefore asserts **version-invariant** behavior — the approve is required (zero starting allowance) and the deposit still succeeds (impossible without the in-batch approve) — never an exact tx count. No 4337 bundler is involved.
