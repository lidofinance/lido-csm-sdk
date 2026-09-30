# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Monorepo Commands (from root)

- `yarn build` - Build all packages
- `yarn build:packages` - Build only publishable packages
- `yarn test` - Run tests across all packages
- `yarn lint` - Run linting across all packages
- `yarn dev` - Start playground development server

### CSM SDK Package Commands (from packages/csm-sdk)

- `yarn build` - Full build process (clean + build CJS, ESM, and types)
- `yarn build:cjs` - Build CommonJS distribution
- `yarn build:esm` - Build ES modules distribution
- `yarn build:types` - Build TypeScript declaration files
- `yarn clean` - Remove dist directory
- `yarn types` - TypeScript type checking without emitting files
- `yarn test` - Run Vitest tests
- `yarn lint` - Run ESLint with TypeScript support (max 0 warnings)

### Development Workflow

After implementing changes: `yarn build && yalc push` (from csm-sdk directory) to update package in dependent projects

## Architecture Overview

### Core Structure

The SDK follows a modular architecture centered around the `LidoSDKCsm` and `LidoSDKCm` classes, which aggregate specialized modules for different aspects of the Lido Community Staking Module (CSM) and Curated Module (CM) ecosystems.

### Main Entry Point

- `packages/csm-sdk/src/lido-sdk-csm.ts` - CSM SDK class that instantiates and manages CSM-specific modules
- `packages/csm-sdk/src/lido-sdk-cm.ts` - CM SDK class that instantiates and manages CM-specific modules
- `packages/csm-sdk/src/sm-sdk/lido-sdk-sm.ts` - `LidoSmSDK` registry over every module deployed on the chain
- `packages/csm-sdk/src/sm-sdk/staking-module-sdk.ts` - `StakingModuleSDK`, abstract base shared by the three module classes
- `packages/csm-sdk/src/index.ts` - Primary export file with re-exports from all modules

### Module Organization

Each module follows a consistent pattern:

- `{module-name}-sdk.ts` - Main SDK implementation
- `types.ts` - TypeScript type definitions
- `index.ts` - Module exports

Key modules include:

**Shared modules** (available in both CSM and CM):
- **core-sdk** - Shared logic, configuration, and core utilities
- **module-sdk** - Module status, StakingRouter registration check, and share limit queries
- **operator-sdk** - Operator data management
- **roles-sdk** - Standard role management
- **keys-sdk** - Validator key management
- **keys-with-status-sdk** - Key tracking with status information
- **keys-cache-sdk** - Pubkey caching to prevent double-submission with 2-week TTL and manual key management
- **bond-sdk** - Operator bond balance management
- **rewards-sdk** - Reward distribution queries
- **events-sdk** - Protocol event queries
- **accounting-sdk** - Balance and supply data
- **parameters-sdk** - Curve parameters access
- **frame-sdk** - Protocol frame configuration
- **tx-sdk** - Module-scoped orchestration over wallet-sdk + allowance-sdk, with Abstract Account (AA) support
- **wallet-sdk** - Chain-scoped AA/multisig detection (cached per address) and raw send; chain-scoped, registered on every module bus
- **allowance-sdk** - ERC20 allowance / permit / approve for an explicit spender; chain-scoped, registered on every module bus
- **deposit-queue-sdk** - Deposit queue pointers and batches
- **deposit-data-sdk** - Parse and validate deposit data JSON, check for duplicates and previously submitted keys
- **fees-monitoring-sdk** - Validator fee recipient monitoring and issue detection
- **discovery-sdk** - Operator discovery and pagination using SMDiscovery contract (renamed from satellite-sdk)
- **delayed-penalty-sdk** - General delayed penalty management: report, cancel, settle (renamed from stealing-sdk, generalized to match contract `GeneralDelayedPenalty` surface)

**CSM-specific modules**:
- **strikes-sdk** - Operator penalty tracking
- **permissionless-gate-sdk** - Permissionless operator creation
- **ics-gate-sdk** - ICS (Independent Community Staker) entry points

**CM-specific modules**:
- **curated-gate-sdk** - Single gate operator creation with merkle proofs
- **curated-gates-collection-sdk** - Multi-gate management and aggregation
- **meta-registry-sdk** - Operator metadata management (name, description) via MetaRegistry contract

### Common Infrastructure

- `packages/csm-sdk/src/common/` - Shared utilities, constants, and primitives
  - `class-primitives/` - Base classes including `CsmSDKModule` and `BusRegistry`
  - `constants/` - Contract addresses, roles, and other constants
  - `utils/` - Helper functions for data parsing and manipulation
  - `decorators/` - Method decorators for caching, logging, and error handling

### BusRegistry & Inter-Module Communication

The **BusRegistry** provides inter-module communication with a Proxy-based design:

#### Architecture

- **Proxy Pattern**: BusRegistry constructor returns a Proxy that intercepts property access
- **Direct Property Access**: Enables `bus.moduleName.method()` instead of `bus.get('moduleName')?.method()`
- **Typing**: each module declares the peers it expects via the `CsmSDKModule<{...}>` generic; this is not checked against what is actually registered — a missing registration surfaces as `undefined` at runtime
- **Self-Registration**: Modules auto-register when passing a name to CsmSDKModule constructor

#### How It Works

1. **BusRegistry** (`bus-registry.ts`):
   - Constructor returns Proxy wrapping the instance
   - Proxy intercepts property access, checking:
     - First: BusRegistry methods (`register`, `get`, `getOrThrow`)
     - Then: Registered modules from internal registry
   - Typed via `BusRegistry<TModules>` generic

2. **CsmSDKModule** (`csm-sdk-module.ts`):
   - Base class for all SDK modules
   - Accepts optional `bus` parameter (creates new if not provided)
   - Self-registers if `name` provided: `new ModuleSDK(props, 'moduleName')`
   - Typed via generic: `extends CsmSDKModule<{ dep1: DepSDK, dep2: DepSDK }>`

3. **StakingModuleSDK** (`sm-sdk/staking-module-sdk.ts`):
   - Creates the single shared BusRegistry and passes it to all modules via `commonProps`
   - Registers the shared `wallet`/`allowance`/`keysCache` services on the bus
   - Module classes (`LidoSDKCsm`/`LidoSDKCm`/`LidoSDKCsm02`) pass `this.commonProps` to their extra modules

#### Usage Examples

```typescript
// Module with dependencies declared via generic
export class OperatorSDK extends CsmSDKModule<{ accounting: AccountingSDK }> {
  async method(shares: bigint) {
    // Direct property access via Proxy
    const eth = await this.bus.accounting.sharesToEth(shares);
  }
}

// Optional dependencies (module may not be registered)
export class DepositDataSDK extends CsmSDKModule<{
  keysWithStatus?: KeysWithStatusSDK;
  keysCache?: KeysCacheSDK;
}> {
  async method(pubkeys: Hex[]) {
    // Use optional chaining for modules that might not exist
    const keys = await this.bus.keysWithStatus?.getApiKeys(pubkeys);
    const status = this.bus.keysCache?.getCacheStatus(pubkey);
  }
}
```

#### Key Benefits

- **Typed access**: declared peers are typed at call sites
- **Clean syntax**: Natural property access instead of getter methods
- **Dependency injection**: No circular dependencies between modules
- **Optional dependencies**: Flexible module composition with `?` operator

### Decorator Order Convention

**Standard order (outermost to innermost):** `@Access → @Logger → @ErrorHandler → @Cache`

**Every transaction method (with`tx.perform`) must have `@Access`** — it declares who can call the method, enabling frontend permission checks via `getMethodAccess()` and `resolveAccess()`.

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
@Cache(CACHE_SHORT)    // Innermost - checks/stores cache
public async getInfo(id: NodeOperatorId): Promise<NodeOperatorInfo>
```

**Why this order:**

- Decorators execute **bottom-to-top** (innermost first)
- `@Access` is metadata-only (stores Symbol on function, no wrapping) — outermost so the Symbol attaches to the final wrapped function
- Logger tracks all calls for debugging/monitoring (executes first)
- ErrorHandler catches errors from both cache and method execution
- Cache only stores successful results (uses `.then()` without `.catch()`)
- Errors are never cached regardless of decorator order

### Access Permission Metadata

The `@Access(...)` decorator exposes **who can execute each transaction method**. This is metadata-only — contracts enforce permissions on-chain; the decorator enables frontend UX (disable buttons, show warnings).

#### Permission Model (`AccessLevel` enum)

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

#### Query Methods (on `CsmSDKModule` base class)

- `getMethodAccess(name)` — type-safe (typos are compile errors), returns `MethodAccess | undefined`
- `getAccessMap()` — returns `Record<string, MethodAccess>` for all annotated methods

#### Runtime Permission Check

`resolveAccess(access, ctx)` — pure function, no RPC calls. Consumer pre-fetches operator info:

```typescript
const operatorInfo = await sdk.operator.getManagementProperties(operatorId);
const access = sdk.bond.getMethodAccess('claimBondStETH')!;
const result = resolveAccess(access, { account: wallet, operatorInfo });
if (!result.allowed) disableButton(result.reason);
```

#### Key Files

- `common/decorators/access-types.ts` — `AccessLevel` enum, `MethodAccess` type
- `common/decorators/access.ts` — `@Access` decorator, `ACCESS` symbol
- `common/utils/can-perform.ts` — `resolveAccess()`, `CanPerformContext`, `CanPerformResult`

### Error Handling (SDKError)

Every error thrown by the SDK is an `SDKError`. Consumers branch on `code` for wallet/network conditions and narrow on `decodedRevert.name` for typed contract revert args.

#### Shape

```typescript
class SDKError extends Error {
  code: ERROR_CODE;                        // always set
  decodedRevert?: DecodedRevert;           // present iff revert selector decoded
  cause?: unknown;                         // original upstream error (viem BaseError)
}
```

- `code` defaults to `ERROR_CODE.UNKNOWN_ERROR`.
- `cause` preserves the full upstream error — walk via `e.cause` to reach the original viem `BaseError` and its `walk()` chain.
- `decodedRevert` is a discriminated union typed via abitype; narrowing on `name` types the `args` tuple.

#### Classification

`classifyError()` maps viem error classes to `ERROR_CODE`. The classifier wins over any caller-supplied `code` because viem class detection is strictly more specific than a context hint (e.g. `TRANSACTION_ERROR`).

| `ERROR_CODE` | Source |
|---|---|
| `USER_REJECTED` | viem `UserRejectedRequestError` (EIP-1193 code 4001) |
| `BUNDLE_NOT_FOUND` | viem `UnknownBundleIdError` (EIP-5792 code 5730) |
| `DUPLICATE_BUNDLE_ID` | viem `DuplicateIdError` (EIP-5792 code 5720) — bundle id already in flight, retry with a fresh one |
| `BATCH_NOT_ATOMIC` | viem `BundleTooLargeError` (5740) / `AtomicityNotSupportedError` (5760) / `AtomicReadyWalletRejectedUpgradeError` (5750) — wallet can't/won't send the batch atomically; fall back to sequential calls |
| `WALLET_UNAUTHORIZED` | viem `UnauthorizedProviderError` (EIP-1193 code 4100) — wallet not unlocked/connected, distinct from `USER_REJECTED` |
| `METHOD_NOT_SUPPORTED` | viem `UnsupportedProviderMethodError` (code 4200) |
| `CHAIN_MISMATCH` | viem `ChainMismatchError` / `SwitchChainError` |
| `NETWORK_ERROR` | viem transport / connectivity errors |
| `RATE_LIMITED` | viem `LimitExceededRpcError` (EIP-1474 code -32005) |
| `INSUFFICIENT_FUNDS` | viem `InsufficientFundsError` |
| `NONCE_ERROR` | viem `NonceTooLowError` / `NonceTooHighError` / `NonceMaxValueError` |
| `FEE_ERROR` | viem `FeeCapTooHighError` / `FeeCapTooLowError` / `TipAboveFeeCapError` |
| `GAS_ERROR` | viem `IntrinsicGasTooHighError` / `IntrinsicGasTooLowError` |
| `NOT_SUPPORTED` | viem `TransactionTypeNotSupportedError`, or explicit context throws (e.g. unsupported contract version) |
| `TRANSACTION_REVERTED` | tx mined, receipt status `reverted` (gas spent) |
| `AA_VALIDATION_ERROR` | `ExecutionRevertedError` whose reason carries an ERC-4337 `AA1x`/`AA2x` prefix (sender/factory deployment, account validation) — best-effort, matched by the ERC's own conventional revert-string prefix, not a wallet vendor's wording |
| `AA_PAYMASTER_ERROR` | `ExecutionRevertedError` whose reason carries an ERC-4337 `AA3x` prefix (paymaster validation/execution) — same best-effort caveat |
| `EXECUTION_REVERTED` | `eth_call` simulation reverted without a decodable selector or recognized `AAxx` prefix |
| `CONTRACT_REVERT` | revert with decodable selector — see `decodedRevert` |
| `WALLET_TIMEOUT` | viem `InternalRpcError`/`InvalidInputRpcError` whose `details` matches timeout wording — best-effort, not spec-stable (EIP-1474 has no dedicated timeout code) |
| `WALLET_RPC_ERROR` | viem `InternalRpcError` / `InvalidInputRpcError` (anything not matched as `WALLET_TIMEOUT`) |
| `DECODE_RESULT_ERROR` | tx mined & confirmed, but `decodeResult` callback threw — see `cause` (`DecodeResultError` with `hash` + `receipt` + `confirmations`) |

Most of this table is class-based and spec-stable (viem maintains the class ↔ RPC/EIP code mapping). `WALLET_TIMEOUT`, `AA_VALIDATION_ERROR`, and `AA_PAYMASTER_ERROR` are the exceptions — they additionally regex-match message text because the EIP they classify against has no dedicated machine-readable code for that case. `AA_*` codes lean on the ERC-4337 spec's own `AAxx` revert-string convention rather than wallet-vendor wording, so they're on firmer ground than `WALLET_TIMEOUT`, but all three are documented as best-effort in `classify-error.ts` and will silently fall through to their generic sibling bucket for non-conforming wording.

#### Narrowing Pattern

```typescript
try {
  await sdk.bond.claimBondStETH(...);
} catch (e) {
  if (!(e instanceof SDKError)) throw e;
  if (e.code === ERROR_CODE.USER_REJECTED) return;       // wallet closed
  if (e.code === ERROR_CODE.NETWORK_ERROR) return retryWithBackoff();
  if (e.code === ERROR_CODE.DECODE_RESULT_ERROR) {       // tx succeeded on-chain
    const c = e.cause as DecodeResultError;
    showSuccessWithExplorerLink(c.hash);                  // c.receipt / c.confirmations also available
    return;
  }
  if (e.decodedRevert?.name === 'AccessControlUnauthorizedAccount') {
    const [account, role] = e.decodedRevert.args;        // typed tuple
    showRoleErrorToast(account, role);
  }
}
```

#### Cause Chain

`cause` is set via the standard `Error.cause` slot. Walk it to inspect the original viem error and its own `cause` chain:

```typescript
let current: unknown = e.cause;
while (current instanceof BaseError) {
  console.log(current.shortMessage);
  current = current.cause;
}
```

#### `formatDecodedRevert(decoded)`

Exported helper that turns a `DecodedRevert` into the canonical `Name(arg1, arg2, ...)` label used as `SDKError.message`. Useful for consumers that hold a raw `decodedRevert` (from a log, a queue, a structured error report) and want the same human-readable string.

#### Key Files

- `common/utils/sdk-error.ts` — `SDKError`, `invariant`, `invariantArgument`, `withSDKError`, `formatDecodedRevert`
- `common/utils/sdk-error-code.ts` — `ERROR_CODE` enum
- `common/utils/decode-revert-data.ts` — `DecodedRevert` discriminated union, `decodeRevertData()`
- `common/utils/classify-error.ts` — viem class → `ERROR_CODE` mapping

### Key Dependencies

- **@lidofinance/lido-ethereum-sdk** - Core Lido SDK (peer dependency)
- **viem** - Ethereum client library (peer dependency)
- **@openzeppelin/merkle-tree** - Merkle tree operations
- **zod** - Runtime type validation
- **abitype** - ABI-level types powering the typed `DecodedRevert` union (direct dependency)

### ABI Management

- `packages/csm-sdk/src/abi/` - Contract ABI definitions for all CSM contracts

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

### Configuration

All modules accept `CsmCoreProps` which includes:

- `core: LidoSDKCore` - Core SDK instance
- `overridedAddresses?: OverridedAddresses` - Custom contract addresses (flat, and/or scoped per `MODULE_NAME`)
- `maxEventBlocksRange?: number` - Event query range limits
- `clApiUrl?: string` - Consensus layer API URL

### Contract Ownership & Management

#### CoreSDK Contract Helpers

**CoreSDK provides centralized contract helpers for high-reuse infrastructure contracts:**

Shared infrastructure (kept in CoreSDK):
- `contractBaseModule` - Dynamic module contract (CSM or CM based on moduleName)
- `contractAccounting` - Bond curve and accounting operations
- `contractEjector` - Validator ejection
- `contractFeeDistributor` - Fee distribution
- `contractFeeOracle` - Fee oracle
- `contractParametersRegistry` - Curve parameters
- `contractHashConsensus` - Beacon consensus
- `contractStakingRouter` - Module registry
- `contractValidatorsExitBusOracle` - Exit bus events
- `contractWithdrawalVault` - Withdrawal vault
- `contractSMDiscovery` - Operator discovery

**Individual modules own their module-specific and single-use contracts:**

Modules manage their own specialized contracts using `this.core.getContract()`:

- **StrikesSDK** - Manages `ValidatorStrikesAbi` contract (single-use)
- **PermissionlessGateSDK** - Manages `PermissionlessGateAbi` contract (single-use)
- **IcsGateSDK** - Manages `VettedGateAbi` contract (single-use)
- **MetaRegistrySDK** - Manages `MetaRegistryAbi` contract (single-use)
- **DepositQueueSDK** - Manages `CSModuleAbi` contract (CSM-specific)
- **CuratedRolesSDK** - Manages `CuratedModuleAbi` contract (CM-specific)

#### Pattern for Module-Owned Contracts

Modules that manage their own contracts follow this pattern:

```typescript
import { CONTRACT_NAMES } from '../common/index.js';

export class ModuleSDK extends CsmSDKModule {
  private get moduleContract() {
    return this.core.getContract(
      CONTRACT_NAMES.contractName,
    );
  }
}
```

**Benefits:**
- Explicit dependencies visible in module code
- Better cohesion (modules own what they use)
- Smaller CoreSDK focused on infrastructure
- No indirection for single-use contracts

### Module SDK Classes

Three module SDK classes cover the staking modules, plus `LidoSmSDK`, a registry that constructs and shares state (wallet, allowance, keysCache) across whichever of them are deployed on a chain.

#### LidoSDKCsm (Community Staking Module)
- **Purpose**: Permissionless and ICS (Independent Community Staker) operator entry
- **Contract**: `csModule` (Mainnet Module ID: 3, Hoodi: 4)
- **Unique Modules**: strikes, permissionlessGate, icsGate, standard roles
- **Use When**: Building applications for permissionless staking or ICS integration

#### LidoSDKCm (Curated Module)
- **Purpose**: Gate-based allowlist operator entry using merkle proofs
- **Contract**: `curatedModule` (Mainnet Module ID: 4, Hoodi: 5)
- **Unique Modules**: curatedGates, metaRegistry, CuratedRolesSDK
- **Use When**: Building applications for curated operator management with allowlists

#### LidoSDKCsm02 (CSM with 0x02 credentials)
- **Purpose**: Permissionless entry for 0x02 (compounding) validators with a top-up queue
- **Contract**: `csModule` (Hoodi Module ID: 6; not on Mainnet yet)
- **Unique Modules**: strikes, permissionlessGate, depositQueue (top-up queue enabled)
- **Use When**: Building for the CSM 0x02 deployment

#### Module Composition Differences

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

#### Contract Addresses

Contract addresses are selected by module and chain in `common/constants/module-config.ts`:
- **Per-module**: `MODULE_CONFIG[MODULE_NAME][chainId]` (module contract, accounting, feeDistributor, gates, …); a missing chain entry makes the constructor throw `NOT_SUPPORTED`
- **Common**: `COMMON_ADDRESSES[chainId]` (stakingRouter, stETH, wstETH, SMDiscovery, …)
- `SdkProps.overridedAddresses` is merged over both. Precedence: common < module config < flat overrides < per-module overrides. Flat stETH/wstETH also apply to allowance/approve (tokens are chain-wide; per-module stETH/wstETH is a type error)
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

Sharing rule: `wallet`, `allowance`, `keysCache` are one instance across modules; everything reading a module address stays per-module. `createSharedServices(props)` (`sm-sdk/shared-services.ts`) builds this triple; both `LidoSmSDK` and `StakingModuleSDK` (when no `shared` is passed) call it.

### Transaction System (tx-sdk)

The **tx-sdk** module provides unified transaction handling across different wallet types.

#### Purpose

- Unified API for transactions across EOA, multisig, and Abstract Account wallets
- Automatic wallet type detection and appropriate flow selection
- Built-in permit/approve handling for token spending
- Support for EIP-5792 batch transactions (sendCalls) for Abstract Accounts

#### Wallet Type Support

1. **EOA (Externally Owned Accounts)**: Standard wallets with permit signature support
2. **Multisig Wallets**: Contract-based wallets requiring explicit approve transactions
3. **Abstract Accounts (AA)**: Smart contract wallets supporting EIP-5792 batch operations via `sendCalls`

#### Transaction Flow

The tx-sdk automatically detects wallet type and routes to the appropriate flow:

- **EOA wallets**: Permit signature → Transaction
- **Multisig wallets**: Approve transaction → Main transaction
- **Abstract Accounts**: Batch operations via `sendCalls` (single transaction for approve + main operation)

#### Core API

The primary method is `tx.perform()` which handles all transaction types:

```typescript
return this.bus.tx.perform({
  account,           // User's wallet address
  callback,          // Optional transaction lifecycle callbacks
  spend: {           // Optional spending configuration
    token: TOKENS.steth,
    amount,
    permit           // Optional permit preferences
  },
  call: ({ permit }) => contract.encode.method([args]),
  decodeResult: (receipt) => parseReceiptData(receipt),
});
```

> `decodeResult` runs **after** the tx is mined and confirmed. If it throws, `tx.perform` rejects with `ERROR_CODE.DECODE_RESULT_ERROR` (cause carries `hash` + `receipt` + `confirmations`) — the tx still succeeded on-chain. See the Error Handling section.

#### Preparing Calls

Calls are encoded with viem's built-in `contract.encode` proxy (the former `prepCall` helper was removed — `encode` infers arg tuples and the payable `value` shape directly from the ABI):

```typescript
// Non-payable function
contract.encode.transfer([address, amount])

// Payable function (value passed via options object)
contract.encode.deposit([operatorId], { value })
```

**Helper utilities**:

- `allowance(account, spender, token)` - Check ERC20 token allowance
- `checkAllowance(account, spender, amount, token)` - Determine if approval needed
- `signPermit(account, spender, amount, token, deadline)` - Sign EIP-2612 permit
- `approve(account, spender, amount, token, callback)` - Execute approve transaction

#### Transaction Lifecycle Callbacks

The tx-sdk provides detailed transaction lifecycle tracking via callbacks:

- `PERMIT_SIGN` - Signing permit for gasless approval
- `APPROVE_SIGN` - Signing approval transaction
- `APPROVE_RECEIPT` - Approval transaction confirmed
- `GAS_LIMIT` - Gas estimation complete
- `SIGN` - Signing main transaction
- `RECEIPT` - Waiting for transaction receipt
- `CONFIRMATION` - Transaction confirmed on chain
- `DONE` - Complete with decoded result
- `MULTISIG_DONE` - Multisig transaction submitted (not yet executed)
- `ERROR` - Error occurred

#### Architecture

- **tx-sdk.ts**: Orchestration — perform() method and helpers, reading `wallet`/`allowance` off the bus (registered by `StakingModuleSDK`) and delegating detection/send to wallet-sdk, spend handling to allowance-sdk
- **types.ts**: Type definitions for transaction operations
- **wallet-sdk/**: Wallet-type detection and raw send (`DecodeResultError`, `BatchTransactionRevertedError` live here)
- **allowance-sdk/**: Allowance checks, EIP-2612 permit signing, approve transactions

### Keys Cache System

The **keys-cache-sdk** module provides pubkey caching functionality to prevent double-submission. `KeysCacheSDK` is chain-scoped like `WalletSDK`/`AllowanceSDK` — not a `CsmSDKModule`, built once per chain via `createSharedServices` and shared across module SDKs:

#### Purpose

- Prevent accidental re-submission of the same validator pubkeys
- Manual key management with 2-week automatic expiration
- Optional integration with deposit data validation

#### Architecture

- **Storage Layer** (`storage.ts`): Low-level localStorage operations and utilities
- **Business Logic** (`keys-cache-sdk.ts`): High-level cache management in SDK class
- **Clean separation**: Storage utilities vs cache business logic

#### Key Features

- **Timestamp-based TTL**: 2-week expiration using timestamps (not block numbers)
- **Chain-specific storage**: localStorage keys include chainId (`lido-keys-cache-${chainId}`)
- **Automatic cleanup**: Expired keys removed on every add/remove operation
- **Duplicate detection**: Integration with DepositDataSDK for validation

#### Usage Examples

```typescript
const sdk = new LidoSDKCsm({ core });

// Manual key management
sdk.keysCache.addPubkeys(['0x123...', '0x456...']);
sdk.keysCache.removePubkeys(['0x123...']);
sdk.keysCache.clearAllKeys();

// Check whether a key was already submitted
const status = sdk.keysCache.getCacheStatus('0x123...'); // KeyCacheStatus.CONFIRMED | KeyCacheStatus.PENDING | null

// Get cache information
const cachedKeys = sdk.keysCache.getCachedKeys(); // Array<{ pubkey, confirmed }>

// Integration with deposit validation
const result = await sdk.depositData.validateDepositData(depositData);
// Only checks the cache for duplicates; keys enter it via the tx callbacks of the add-keys / create-operator flows
```

### Testing

Two Vitest projects share `packages/csm-sdk/vitest.config.ts`:

- **`unit`** — `tests/unit/**/*.test.ts`. Pure logic only. Run with `yarn test`. Fast (~1.5s, 400 tests).
- **`integration`** — `tests/integration/**/*.test.ts`. Anvil-backed SDK calls against a hoodi fork. Run with `yarn test:integration`. Requires `.env` (see `.env.example`).
- `yarn test:all` runs both. Tests use explicit imports from `vitest` (no globals).

**Fixtures (`tests/helpers/`)** follow a cached `use*()` pattern: `useCsmSdk()`, `useCmSdk()`, `useWalletClient()`, `useTestClient()`, `useAccount()`, `useAltAccount()`. Each helper memoizes and returns the same instance per test process. See `packages/csm-sdk/tests/README.md` for the full guide.

**File naming convention**: `tests/integration/*-wallet.test.ts` for tests that sign + broadcast; plain `tests/integration/*.test.ts` for read-only SDK calls. Mirrors lido-ethereum-sdk's separation.

**Snapshot tests**: `tests/unit/access-coverage.test.ts` pins the `@Access` annotation across every SDK module — any accidental annotation loss becomes a visible snapshot diff in PR review. Refresh deliberately with `yarn test -u` when changing access levels.

**AA testing strategy**: see `tests/README.md` § AA. Unit-level capability mocking covers TxSDK routing; the integration test exercises routing + callback contract + receipt handling by faking `getCapabilities` (atomic: supported) and relying on viem's `experimental_fallback`. How the batch lands on-chain is **anvil-version dependent**: newer anvil implements `wallet_sendCalls` and runs the batch atomically (nonce +1), while older anvil makes the fallback fan out to sequential `eth_sendTransaction` (nonce +2). The AA test therefore asserts **version-invariant** behavior — the approve is required (zero starting allowance) and the deposit still succeeds (impossible without the in-batch approve) — never an exact tx count. No 4337 bundler is involved.
