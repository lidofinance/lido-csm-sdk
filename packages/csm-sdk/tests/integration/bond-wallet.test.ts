import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseEther } from 'viem';
import {
  useAccount,
  useCsmSdk,
  useCsmSdkWithWallet,
  useTestClient,
} from '../helpers';

// Real signed transaction against the hoodi fork. Exercises the EOA branch
// of TxSDK.perform — signTransaction + sendRawTransaction + waitForReceipt.

const OPERATOR_ID = 0n;

describe('integration: bond-wallet (EOA, real signed tx)', () => {
  let snapshotId: `0x${string}`;

  // Snapshot/revert keeps account nonce + bond + balance from leaking into
  // any other integration test that shares the singleFork anvil instance.
  beforeEach(async () => {
    snapshotId = await useTestClient().snapshot();
  });

  afterEach(async () => {
    await useTestClient().revert({ id: snapshotId });
  });

  it('addBondETH submits a signed tx and returns a success receipt', async () => {
    const test = useTestClient();
    const sdk = useCsmSdkWithWallet();
    const readSdk = useCsmSdk();
    const account = useAccount();

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

    const result = await sdk.bond.addBondETH({
      nodeOperatorId: OPERATOR_ID,
      amount: parseEther('1'),
    });

    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.receipt?.status).toBe('success');
    expect(result.receipt?.from).toBe(account.address.toLowerCase());
  });
});
