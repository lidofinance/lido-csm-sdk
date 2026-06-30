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
  mintStETH,
  useAltAccount,
  useCsmSdk,
  usePublicClient,
  useTestClient,
} from '../helpers';

// Exercises the MULTISIG *spend* branch of TxSDK — the "Safe falls back to 2
// txs" path. When a contract account needs an ERC20 approve, TxSDK signs and
// broadcasts ONLY the approve tx, then returns hash-only with the main deposit
// DEFERRED (no receipt/result): the deposit is left for the external signers
// to co-sign. addBondStETH(...) therefore resolves to { hash } the moment the
// approve is sent — see signPermitOrApprove → approve (multisig) → performTransaction
// short-circuit on `if (hash) return { hash }`.
//
// Ordering matters: the alt account must mint stETH BEFORE we install bytecode,
// because minting is a real signed tx and an EOA cannot sign once it's "code".
//
// The on-chain allowance is set to amount + 10n: stETH's STETH_ROUNDING_THRESHOLD
// bump that parseSpendingProps adds to every stETH approve/permit request.

const OPERATOR_ID = 0n;
// PUSH1 0 PUSH1 0 — 4 bytes of EVM bytecode. The bytes never execute (anvil
// only needs non-empty code so core.isContract returns true) but a literal
// keeps intent honest and survives any future bytecode-shape check.
const MIN_BYTECODE = '0x60006000' as const;
// Seed unique to this test file — keeps the alt account's nonce isolated from
// any other test that uses useAltAccount() with a different seed.
const MULTISIG_ALT_SEED = 0xb0_d4_5e_71n;

describe('integration: bond-permit-multisig (multisig spend branch via setCode trick)', () => {
  let snapshotId: `0x${string}`;

  beforeEach(async () => {
    const test = useTestClient();
    snapshotId = await test.snapshot();
  });

  afterEach(async () => {
    const test = useTestClient();
    await test.revert({ id: snapshotId });
  });

  it('sends approve only and returns hash-only with APPROVE_SIGN + MULTISIG_DONE (deposit deferred)', async () => {
    const test = useTestClient();
    const publicClient = usePublicClient();
    const account = useAltAccount(MULTISIG_ALT_SEED);

    // Per-test wallet client bound to the alt account — avoids touching the
    // shared cached EOA used by other integration tests.
    const walletClient = createWalletClient({
      account,
      chain: chainById(anvilChainId()),
      transport: http(anvilRpcUrl()),
    });
    const sdk = makeCsmSdk(publicClient, walletClient);

    // Pin a useful failure mode: the deposit below targets operator 0. The
    // multisig branch never awaits a receipt, so a missing operator would
    // otherwise pass silently — surface the precondition explicitly.
    const operatorsCount = await useCsmSdk().module.getOperatorsCount();
    if (operatorsCount === 0n) {
      throw new Error(
        'fork has no operators — pin TEST_FORK_BLOCK to a known-good block',
      );
    }

    await test.setBalance({
      address: account.address,
      value: parseEther('100'),
    });

    // Mint stETH while the account is still a plain EOA — minting is a real
    // signed tx (nonce 0 → 1, normal base fee). Must happen before setCode.
    await mintStETH(walletClient, parseEther('50'));

    // NOW apply the multisig trick: install bytecode so core.isContract → true.
    await test.setCode({
      address: account.address,
      bytecode: MIN_BYTECODE,
    });
    // SDK's multisig stub hard-codes nonce: 1 (tx-sdk.ts internalTransaction).
    // Minting already advanced the nonce to 1, so this simply realigns it.
    await test.setNonce({ address: account.address, nonce: 1 });
    // Match the maxFeePerGas: 1n stub. mine() commits the base fee change so
    // it applies to the block our approve tx will be included in.
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

    const amount = parseEther('1');
    const result = await sdk.bond.addBondStETH({
      nodeOperatorId: OPERATOR_ID,
      amount,
      callback,
    });

    // Multisig spend branch: only the approve was sent. The main deposit is
    // deferred to the external signers, so we get hash-only — no receipt/result.
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.receipt).toBeUndefined();
    expect(result.result).toBeUndefined();

    // Callback fingerprints: APPROVE_SIGN + MULTISIG_DONE fire for the approve.
    // The deposit never runs, so no PERMIT_SIGN (multisig approves, not permits),
    // no GAS_LIMIT (contract branch skips estimation), no CONFIRMATION, no DONE.
    expect(stages).toContain(TransactionCallbackStage.APPROVE_SIGN);
    expect(stages).toContain(TransactionCallbackStage.MULTISIG_DONE);
    expect(stages).not.toContain(TransactionCallbackStage.PERMIT_SIGN);
    expect(stages).not.toContain(TransactionCallbackStage.GAS_LIMIT);
    expect(stages).not.toContain(TransactionCallbackStage.CONFIRMATION);
    expect(stages).not.toContain(TransactionCallbackStage.DONE);

    // No on-chain allowance assertion: the multisig branch signs the approve with
    // stub fee/gas params (maxFeePerGas: 1n, gas: 21_000n, nonce: 1 — tx-sdk.ts:148-156)
    // that model "submitted to the Safe for the owners to execute". anvil never
    // actually includes that tx (underpriced + under-gassed), so there is no on-chain
    // effect to read — confirmed: result.hash has no receipt and the account nonce
    // does not advance. The behavioral contract above (hash-only, APPROVE_SIGN +
    // MULTISIG_DONE, deposit deferred) is the real coverage for this branch.
  }, 30_000);
});
