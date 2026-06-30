import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseEther, type Hex } from 'viem';
import {
  useAccount,
  useCsmSdk,
  useCsmSdkWithWallet,
  useTestClient,
} from '../helpers';
import { TransactionCallbackStage } from '../../src/tx-sdk/types';

// Real signed tx against the hoodi fork: creates a node operator via the
// Permissionless Gate (addNodeOperatorETH). The gate is AccessLevel.ANYONE, so
// no role/proof is needed. Synthetic dummy keys pass because CSM defers BLS
// verification to a later stage — submission only concatenates the bytes. The
// bond is computed dynamically from the curve via accounting, and the freshly
// minted operator id equals the prior operators count.

describe('integration: permissionless-gate-wallet (EOA, real signed tx)', () => {
  let snapshotId: `0x${string}`;

  // Snapshot/revert keeps the new operator + nonce + balance from leaking into
  // any other integration test that shares the singleFork anvil instance.
  beforeEach(async () => {
    snapshotId = await useTestClient().snapshot();
  });

  afterEach(async () => {
    await useTestClient().revert({ id: snapshotId });
  });

  it('addNodeOperatorETH creates an operator and returns a success receipt', async () => {
    const test = useTestClient();
    const account = useAccount();
    const sdk = useCsmSdkWithWallet();
    const readSdk = useCsmSdk();

    await test.setBalance({
      address: account.address,
      value: parseEther('1000'),
    });

    // Creation reverts while the module is paused — surface a clear message
    // instead of a cryptic on-chain revert if the fork is pinned to a paused block.
    const status = await readSdk.module.getStatus();
    if (status.isPausedModule) {
      throw new Error('module paused at this fork block — pin a resumed block');
    }

    const countBefore = await readSdk.module.getOperatorsCount();
    const curveId = await sdk.permissionlessGate.getCurveId();
    const amount = await readSdk.accounting.getBondAmountByKeysCountETH({
      curveId,
      keysCount: 1n,
    });

    // 48-byte pubkey + 96-byte signature, non-zero. CSM does no BLS check here.
    const pubkey = ('0x' + 'ab'.repeat(48)) as Hex;
    const signature = ('0x' + 'cd'.repeat(96)) as Hex;
    const depositData = [{ pubkey, signature }];

    const stages: TransactionCallbackStage[] = [];
    const result = await sdk.permissionlessGate.addNodeOperatorETH({
      amount,
      depositData,
      managerAddress: account.address,
      rewardsAddress: account.address,
      callback: (p) => {
        stages.push(p.stage);
      },
    });

    expect(result.receipt?.status).toBe('success');
    expect(result.result?.nodeOperatorId).toBe(countBefore);
    expect(result.result?.managerAddress.toLowerCase()).toBe(
      account.address.toLowerCase(),
    );
    expect(result.result?.rewardsAddress.toLowerCase()).toBe(
      account.address.toLowerCase(),
    );

    // EOA path: gas estimation → sign → receipt → confirmation → done.
    expect(stages).toContain(TransactionCallbackStage.GAS_LIMIT);
    expect(stages).toContain(TransactionCallbackStage.SIGN);
    expect(stages).toContain(TransactionCallbackStage.RECEIPT);
    expect(stages).toContain(TransactionCallbackStage.CONFIRMATION);
    expect(stages).toContain(TransactionCallbackStage.DONE);

    // No token spend (ETH), no approve, no multisig.
    expect(stages).not.toContain(TransactionCallbackStage.PERMIT_SIGN);
    expect(stages).not.toContain(TransactionCallbackStage.APPROVE_SIGN);
    expect(stages).not.toContain(TransactionCallbackStage.MULTISIG_DONE);
  }, 60_000);
});
