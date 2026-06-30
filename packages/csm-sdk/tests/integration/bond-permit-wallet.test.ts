import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseEther } from 'viem';
import {
  TransactionCallbackStage,
  type TransactionCallbackProps,
} from '../../src/tx-sdk/types';
import type { AddBondResult } from '../../src/bond-sdk/types';
import {
  mintStETH,
  mintWstETH,
  useAccount,
  useCsmSdk,
  useCsmSdkWithWallet,
  useTestClient,
  useWalletClient,
} from '../helpers';

// Exercises the EOA EIP-2612 permit spend branch of TxSDK.perform.
// Freshly minted token ⇒ allowance to csAccounting is 0 ⇒ the SDK signs an
// EIP-2612 permit instead of sending an approve tx (no APPROVE_* stages).
// wstETH has no +10n rounding bump on the permit amount, stETH does — not
// asserted here, just context for why both tokens are covered.

const OPERATOR_ID = 0n;

describe('integration: bond-permit-wallet (EOA, EIP-2612 permit spend)', () => {
  let snapshotId: `0x${string}`;

  // Snapshot/revert undoes the per-test funding + minted balance so it never
  // leaks into other tests sharing the singleFork anvil instance.
  beforeEach(async () => {
    snapshotId = await useTestClient().snapshot();
  });

  afterEach(async () => {
    await useTestClient().revert({ id: snapshotId });
  });

  it('addBondStETH signs a permit (no approve tx) and returns a success receipt', async () => {
    const test = useTestClient();
    const account = useAccount();
    const sdk = useCsmSdkWithWallet();
    const readSdk = useCsmSdk();

    await test.setBalance({
      address: account.address,
      value: parseEther('1000'),
    });

    const operatorsCount = await readSdk.module.getOperatorsCount();
    if (operatorsCount === 0n) {
      throw new Error(
        'fork has no operators — pin TEST_FORK_BLOCK to a known-good block',
      );
    }

    // Freshly minted ⇒ allowance to accounting is 0 ⇒ permit branch taken.
    await mintStETH(useWalletClient(), parseEther('100'));

    const stages: TransactionCallbackStage[] = [];
    const callback = vi.fn((p: TransactionCallbackProps<AddBondResult>) => {
      stages.push(p.stage);
    });

    const result = await sdk.bond.addBondStETH({
      nodeOperatorId: OPERATOR_ID,
      amount: parseEther('1'),
      callback,
    });

    expect(result.receipt?.status).toBe('success');
    expect(result.result).toMatchObject({
      current: expect.any(BigInt),
      required: expect.any(BigInt),
    });

    expect(stages).toContain(TransactionCallbackStage.PERMIT_SIGN);
    expect(stages).toContain(TransactionCallbackStage.SIGN);
    expect(stages).toContain(TransactionCallbackStage.DONE);
    expect(stages).not.toContain(TransactionCallbackStage.APPROVE_SIGN);
    expect(stages).not.toContain(TransactionCallbackStage.APPROVE_RECEIPT);
    expect(stages).not.toContain(TransactionCallbackStage.MULTISIG_DONE);
  }, 60_000);

  it('addBondWstETH signs a permit and returns a success receipt', async () => {
    const test = useTestClient();
    const account = useAccount();
    const sdk = useCsmSdkWithWallet();
    const readSdk = useCsmSdk();

    await test.setBalance({
      address: account.address,
      value: parseEther('1000'),
    });

    const operatorsCount = await readSdk.module.getOperatorsCount();
    if (operatorsCount === 0n) {
      throw new Error(
        'fork has no operators — pin TEST_FORK_BLOCK to a known-good block',
      );
    }

    // Freshly minted ⇒ allowance to accounting is 0 ⇒ permit branch taken.
    await mintWstETH(useWalletClient(), parseEther('100'));

    const stages: TransactionCallbackStage[] = [];
    const callback = vi.fn((p: TransactionCallbackProps<AddBondResult>) => {
      stages.push(p.stage);
    });

    const result = await sdk.bond.addBondWstETH({
      nodeOperatorId: OPERATOR_ID,
      amount: parseEther('1'),
      callback,
    });

    expect(result.receipt?.status).toBe('success');
    expect(result.result).toMatchObject({
      current: expect.any(BigInt),
      required: expect.any(BigInt),
    });

    expect(stages).toContain(TransactionCallbackStage.PERMIT_SIGN);
    expect(stages).toContain(TransactionCallbackStage.SIGN);
    expect(stages).toContain(TransactionCallbackStage.DONE);
    expect(stages).not.toContain(TransactionCallbackStage.APPROVE_SIGN);
    expect(stages).not.toContain(TransactionCallbackStage.APPROVE_RECEIPT);
    expect(stages).not.toContain(TransactionCallbackStage.MULTISIG_DONE);
  }, 60_000);
});
