# Testing

Two test projects, one Vitest config (`vitest.config.ts`):

| Project | Files | What it covers | When it runs |
|---|---|---|---|
| `unit` | `tests/unit/**/*.test.ts` | Pure logic — decoders, parsers, merkle utils, `@Access` metadata coverage, `keys-cache` localStorage. No network, no chain. | Every push, every PR (incl. forks). |
| `integration` | `tests/integration/**/*.test.ts` | SDK against a real fork via anvil. Read-only views, wallet flows, EIP-2612 permits, multisig approve, EIP-5792 AA branch (faked `getCapabilities` + viem `experimental_fallback`). | Internal PRs only (needs RPC + funded account). |

## Commands

```bash
yarn test              # unit only (fast, default)
yarn test:integration  # anvil-backed (needs .env)
yarn test:all          # both
yarn test -u           # update snapshots (intentional changes only)
```

## Local setup for integration tests

1. Install [Foundry](https://book.getfoundry.sh/getting-started/installation) so `anvil` is on `$PATH`.
2. Copy the env template:
   ```bash
   cp packages/csm-sdk/.env.example packages/csm-sdk/.env
   ```
3. Set `TEST_RPC_URL` to a Hoodi-compatible RPC. The default in `.env.example` (publicnode) works; switch to a private endpoint for sustained use.
4. `yarn workspace @lidofinance/lido-csm-sdk test:integration`.

`TEST_PRIVATE_KEY` defaults to **anvil dev account #0** — funded automatically by the fork. Only override it if a test needs a specific funded address.

## Fixture pattern (`tests/helpers/use-*.ts`)

Every helper is a cached factory. First call boots, subsequent calls return the same instance:

```typescript
import { useCsmSdk, usePublicClient } from '../helpers';

const sdk = useCsmSdk();              // LidoSDKCsm bound to anvil fork
const client = usePublicClient();     // viem PublicClient
```

Available fixtures:

- `useAccount()` — `PrivateKeyAccount` from `TEST_PRIVATE_KEY`
- `useAltAccount(seed?: bigint)` — deterministic alt account derived from the primary key plus `seed` (default `1n`). Pass a seed unique to your test file (e.g. `useAltAccount(0x6d756c74695f31n)`) to keep nonce/balance state isolated from other tests sharing the singleFork anvil. Cached per-seed.
- `usePublicClient()` — read-only viem client
- `useWalletClient()` — viem WalletClient signing with primary account
- `useTestClient()` — `TestClient<'anvil'>` extended with public actions, for `setBalance`, `impersonateAccount`, `mine`, `snapshot`
- `useCsmSdk()` / `useCsmSdkWithWallet()` — `LidoSDKCsm` (read-only or signing)
- `useCmSdk()` / `useCmSdkWithWallet()` — `LidoSDKCm` (read-only or signing)

### Cached SDKs + chain mutations = stale reads

`useCsmSdk()` and `useCmSdk()` cache one shared `LidoSDK*` instance per process. Their read methods are `@Cache`-decorated with TTLs. If a test reads a value through the shared SDK, then mutates chain state via `useTestClient()` (`setCode`, `setBalance`, executing a tx), then re-reads through the SAME SDK, the cached pre-mutation value is returned until the TTL elapses.

Two ways to dodge it:

1. **Use `makeCsmSdk(publicClient, walletClient?)`** (see `tests/helpers/make-csm-sdk.ts`) to get a fresh SDK per test — `bond-aa.test.ts` and `bond-multisig.test.ts` already do this for their write paths.
2. **Call `sdk.core.invalidateCache()`** between the mutation and the re-read if you must reuse the shared SDK.

## File naming conventions

- `*.test.ts` in `tests/unit/` — read-only, no chain
- `*.test.ts` in `tests/integration/` — chain reads via SDK against fork
- `*-wallet.test.ts` in `tests/integration/` — signs + broadcasts; uses `useCsmSdkWithWallet()`
- Snapshot files live next to their test in `__snapshots__/`. Refresh deliberately via `yarn test -u`; review the diff in PR.

## Writing a wallet test

```typescript
import { describe, expect, it } from 'vitest';
import { parseEther } from 'viem';
import { useAccount, useCsmSdkWithWallet, useTestClient } from '../helpers';

describe('bond: deposit (wallet)', () => {
  it('deposits ETH for an operator', async () => {
    const test = useTestClient();
    const account = useAccount();
    const sdk = useCsmSdkWithWallet();

    // Fund + snapshot so other tests aren't affected
    await test.setBalance({ address: account.address, value: parseEther('100') });
    const snapshotId = await test.snapshot();

    try {
      const receipt = await sdk.bond.depositETH({
        operatorId: 0n,
        amount: parseEther('2'),
      });
      expect(receipt.status).toBe('success');
    } finally {
      await test.revert({ id: snapshotId });
    }
  });
});
```

## Wallet-type test matrix

The SDK routes through three branches based on the signer type. Each branch is covered at both layers:

| Branch | Detection | Unit tests | Integration test | Anvil trick |
|---|---|---|---|---|
| **EOA** | `!isContract && !atomic` | `detection.test.ts` (8 cases), `perform-routing.test.ts` (5 cases), `sign-permit-or-approve.test.ts` (3 cases), `internal-call.test.ts` (existing 13 cases) | `bond-wallet.test.ts` | `setBalance` |
| **Multisig** | `isContract === true` | same as EOA + the multisig branch in `sign-permit-or-approve.test.ts` | `bond-multisig.test.ts` | `setCode` + `setNonce(1)` + `setNextBlockBaseFeePerGas(1n)` + `mine(1)` |
| **AA (EIP-5792)** | `getCapabilities.atomic === 'supported'` | `detection.test.ts` + routing tests | `bond-aa.test.ts` | walletClient `.extend({ getCapabilities })` + viem's `experimental_fallback: true` |

### Multisig integration nuances

The SDK hard-codes `nonce: 1` + `gas: 21_000n` + `maxFeePerGas: 1n` in the multisig branch (`tx-sdk.ts:117`). In production a Safe wallet ignores these stubs and uses its own internal counters. To exercise the branch against anvil:

- `setNonce({ nonce: 1 })` — match the stub
- `setNextBlockBaseFeePerGas({ baseFeePerGas: 1n })` + `mine({ blocks: 1 })` — the `setNext*` family applies to the NEXT block, so an empty mine is required to commit it BEFORE the tx is broadcast. Without the mine, the tx sits in the mempool because `maxFeePerGas: 1` < the current block's base fee.
- An alt account + per-test `snapshot`/`revert` keeps the contract-account state from leaking into other tests.

The branch returns `{ hash }` only (no `receipt`) — semantically: "submitted to the multisig, awaiting external signers."

### AA integration nuances

This is a routing + callback + receipt-handling test, **not** an atomicity test. We don't run a 4337 bundler and there's no real EIP-5792 provider. The suite never explicitly uses EIP-7702 (`signAuthorization`), though viem's fallback may use it internally on chains that support it. Two facts make this OK:

1. The SDK's only AA-detection signal is `walletClient.getCapabilities` reporting `atomic` as supported. Extending the walletClient with a fake `getCapabilities` is enough to force the AA branch.
2. The SDK passes `experimental_fallback: true` to `sendCalls`. How viem lands the batch on-chain is **anvil-version dependent**: older anvil (no `wallet_sendCalls`) makes the fallback execute the calls as sequential `eth_sendTransaction` (nonce +2), while newer anvil runs the batch atomically as a single tx (nonce +1). The SDK's logic — routing, callback contract, receipt handling, decoding — doesn't depend on which path runs, so `bond-aa.test.ts` asserts version-invariant facts (approve required from a zero allowance + deposit succeeds), never an exact tx count.

For *contract-side* atomicity testing (e.g., partial-failure scenarios), a 4337 stack would be needed. None of the CSM contracts depend on atomicity at the SDK boundary, so this isn't on the roadmap.

See the [AA Status Quirk](../CLAUDE.md) note in package CLAUDE.md for the production failure mode that no test infra catches: smart-account wallets returning `'failure'` callStatus on a successful tx. The SDK trusts the receipt over `callStatus.status` — `internal-call.test.ts` has a regression test for this.

## Snapshot-style tests

`tests/unit/access-coverage.test.ts` snapshots `getAccessMap()` for every SDK module class. Any added/removed/changed `@Access` annotation becomes a visible diff in PR review — this catches accidental annotation loss when refactoring transaction methods.

If you intentionally change an `@Access` level, run `yarn test -u` and review the snapshot diff alongside the code change.
