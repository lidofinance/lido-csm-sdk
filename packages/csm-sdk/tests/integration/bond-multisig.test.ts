import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWalletClient, http, parseEther } from 'viem';
import {
  TransactionCallbackStage,
  type TransactionCallback,
  type TransactionCallbackProps,
} from '../../src/tx-sdk/types';
import type { AddBondResult } from '../../src/bond-sdk/types';
import {
  anvilChainId,
  anvilRpcUrl,
  chainById,
  makeCsmSdk,
  useAltAccount,
  useCsmSdk,
  usePublicClient,
  useTestClient,
} from '../helpers';

// Exercises the multisig branch of TxSDK.internalTransaction.
//
// Setup: install bytecode at the signer's address so `core.isContract` returns
// true. We derive an isolated alt account via a seed unique to this file so a
// future test using useAltAccount() with a different seed cannot collide on
// nonce. The per-test snapshot/revert keeps the rest of the suite clean.
//
// The SDK hard-codes `nonce: 1` in the multisig stub (tx-sdk.ts:117) because
// real Safe wallets carry their own internal nonce — we satisfy it via
// anvil_setNonce. The fork's base fee is dropped to 1 wei via setNextBlockBaseFeePerGas
// to match the `maxFeePerGas: 1n` stub.

const OPERATOR_ID = 0n;
// PUSH1 0 PUSH1 0 — 4 bytes of EVM bytecode. The bytes never execute (anvil
// only needs non-empty code so core.isContract returns true) but a literal
// keeps intent honest and survives any future bytecode-shape check.
const MIN_BYTECODE = '0x60006000' as const;
// Seed unique to this test file — keeps the alt account's nonce isolated from
// any future test that uses useAltAccount() with a different seed.
const MULTISIG_ALT_SEED = 0xb0_d4_07n;

describe('integration: bond-multisig (multisig branch via setCode trick)', () => {
  let snapshotId: `0x${string}`;

  beforeEach(async () => {
    const test = useTestClient();
    snapshotId = await test.snapshot();
  });

  afterEach(async () => {
    const test = useTestClient();
    await test.revert({ id: snapshotId });
  });

  it('takes the contract-account branch and returns hash-only with MULTISIG_DONE callback', async () => {
    const test = useTestClient();
    const publicClient = usePublicClient();
    const account = useAltAccount(MULTISIG_ALT_SEED);

    // Pin a useful failure mode: the SDK call below will revert on-chain if
    // the fork has no operator 0 registered. The multisig branch returns
    // hash-only without awaiting a receipt, so a revert would otherwise pass
    // this test silently — surface the precondition explicitly.
    const operatorsCount = await useCsmSdk().module.getOperatorsCount();
    if (operatorsCount === 0n) {
      throw new Error(
        'fork has no operators — pin TEST_FORK_BLOCK to a known-good block',
      );
    }

    // Per-test wallet client bound to the alt account — avoids touching the
    // shared cached EOA used by other integration tests.
    const walletClient = createWalletClient({
      account,
      chain: chainById(anvilChainId()),
      transport: http(anvilRpcUrl()),
    });
    const sdk = makeCsmSdk(publicClient, walletClient);

    await test.setBalance({
      address: account.address,
      value: parseEther('100'),
    });
    await test.setCode({
      address: account.address,
      bytecode: MIN_BYTECODE,
    });
    // SDK's multisig stub expects nonce: 1 (see tx-sdk.ts:117)
    await test.setNonce({ address: account.address, nonce: 1 });
    // Match the maxFeePerGas: 1n stub. mine() commits the base fee change
    // so it applies to the block our tx will be included in.
    await test.setNextBlockBaseFeePerGas({ baseFeePerGas: 1n });
    await test.mine({ blocks: 1 });

    // Sanity check: SDK should now see the account as a contract.
    const isMultisig = await sdk.tx.isMultisig();
    expect(isMultisig).toBe(true);

    const stages: TransactionCallbackStage[] = [];
    const callback: TransactionCallback<AddBondResult> = vi.fn(
      (p: TransactionCallbackProps<AddBondResult>) => {
        stages.push(p.stage);
      },
    );

    const result = await sdk.bond.addBondETH({
      nodeOperatorId: OPERATOR_ID,
      amount: parseEther('1'),
      callback,
    });

    // Multisig branch: hash only, no receipt awaited
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.receipt).toBeUndefined();
    expect(result.confirmations).toBeUndefined();

    // Callback fingerprints: MULTISIG_DONE replaces RECEIPT/CONFIRMATION/DONE.
    // GAS_LIMIT must NOT fire — multisig branch skips estimation entirely.
    expect(stages).toContain(TransactionCallbackStage.SIGN);
    expect(stages).toContain(TransactionCallbackStage.MULTISIG_DONE);
    expect(stages).not.toContain(TransactionCallbackStage.GAS_LIMIT);
    expect(stages).not.toContain(TransactionCallbackStage.CONFIRMATION);
    expect(stages).not.toContain(TransactionCallbackStage.DONE);
  }, 30_000);
});
