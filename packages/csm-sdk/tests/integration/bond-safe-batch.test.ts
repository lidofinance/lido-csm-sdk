import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWalletClient, http, parseEther, type Hex } from 'viem';
import { TOKENS } from '../../src/common/constants/tokens';
import {
  TransactionCallbackStage,
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

const OPERATOR_ID = 0n;
// PUSH1 1 PUSH1 0 MSTORE PUSH1 32 PUSH1 0 RETURN: any call returns uint256(1), so getThreshold() reads as a 1-of-1 Safe
const SAFE_LIKE_BYTECODE = '0x600160005260206000f3' as const;
const SAFE_BATCH_ALT_SEED = 0x5a_fe_ba_7cn;
const SAFE_TX_HASH: Hex = `0x${'33'.repeat(32)}`;

describe('integration: bond-safe-batch (multisigBatch via setCode + legacy caps)', () => {
  let snapshotId: Hex;

  beforeEach(async () => {
    snapshotId = await useTestClient().snapshot();
  });

  afterEach(async () => {
    await useTestClient().revert({ id: snapshotId });
  });

  it('proposes approve + addBond as one wallet_sendCalls and sends no transaction', async () => {
    const test = useTestClient();
    const publicClient = usePublicClient();
    const account = useAltAccount(SAFE_BATCH_ALT_SEED);
    const chainId = anvilChainId();

    const operatorsCount = await useCsmSdk().module.getOperatorsCount();
    if (operatorsCount === 0n) {
      throw new Error(
        'fork has no operators — pin TEST_FORK_BLOCK to a known-good block',
      );
    }

    const sendCalls = vi.fn(async (_args: unknown) => ({ id: SAFE_TX_HASH }));
    const walletClient = createWalletClient({
      account,
      chain: chainById(chainId),
      transport: http(anvilRpcUrl()),
    }).extend(() => ({
      getCapabilities: async () => ({
        [chainId]: { atomicBatch: { supported: true } },
      }),
      sendCalls,
    }));
    const sdk = makeCsmSdk(publicClient, walletClient);

    await test.setBalance({
      address: account.address,
      value: parseEther('10'),
    });
    await test.setCode({
      address: account.address,
      bytecode: SAFE_LIKE_BYTECODE,
    });
    const nonceBefore = await publicClient.getTransactionCount({
      address: account.address,
    });

    const estimate = await sdk.bond.estimateAddBond({
      token: TOKENS.eth,
      nodeOperatorId: OPERATOR_ID,
      amount: parseEther('1'),
    });
    expect(estimate.walletKind).toBe('multisigBatch');

    const stages: TransactionCallbackStage[] = [];
    const result = await sdk.bond.addBondStETH({
      nodeOperatorId: OPERATOR_ID,
      amount: parseEther('1'),
      callback: (p: TransactionCallbackProps<AddBondResult>) => {
        stages.push(p.stage);
      },
    });

    expect(result).toEqual({ hash: SAFE_TX_HASH });
    expect(sendCalls).toHaveBeenCalledTimes(1);
    expect(
      (sendCalls.mock.calls[0]![0] as { calls: unknown[] }).calls,
    ).toHaveLength(2);
    expect(stages).toEqual([
      TransactionCallbackStage.SIGN,
      TransactionCallbackStage.MULTISIG_DONE,
    ]);
    expect(
      await publicClient.getTransactionCount({ address: account.address }),
    ).toBe(nonceBefore);
  }, 30_000);
});
