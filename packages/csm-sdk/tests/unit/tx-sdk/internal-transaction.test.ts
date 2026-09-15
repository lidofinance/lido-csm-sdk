import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address, Hash, TransactionReceipt } from 'viem';
import type { ReplacementReason } from 'viem/actions';
import { TxSDK } from '../../../src/tx-sdk/tx-sdk';
import {
  TransactionCallbackStage,
  type TransactionCallbackProps,
} from '../../../src/tx-sdk/types';
import { ERROR_CODE, SDKError } from '../../../src/common/utils/sdk-error';

const ACCOUNT_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;
const TX_HASH =
  '0x1111111111111111111111111111111111111111111111111111111111111111' as Hash;
const REPLACEMENT_HASH =
  '0x2222222222222222222222222222222222222222222222222222222222222222' as Hash;

const makeReceipt = (
  status: 'success' | 'reverted',
  transactionHash: Hash = TX_HASH,
): TransactionReceipt =>
  ({
    status,
    transactionHash,
    blockHash: '0x' as Hash,
    blockNumber: 0n,
    gasUsed: 0n,
    logs: [],
  }) as unknown as TransactionReceipt;

const buildTx = () => {
  const sendTransaction = vi.fn(async (_args: unknown) => TX_HASH);
  const getGasLimit = vi.fn(async (_args: unknown) => 21_000n);
  const waitForTransactionReceipt =
    vi.fn<(args: Record<string, unknown>) => Promise<TransactionReceipt>>();
  const invalidateCache = vi.fn();

  const fakeCore = {
    chain: undefined,
    core: {
      useAccount: async () => ({ address: ACCOUNT_ADDRESS }),
      isContract: async () => false,
      getFeeData: async () => ({ maxFeePerGas: 1n, maxPriorityFeePerGas: 1n }),
      publicClient: {
        waitForTransactionReceipt,
        getTransactionConfirmations: async (_args: unknown) => 5n,
      },
    },
    invalidateCache,
  };

  const tx = new TxSDK({ core: fakeCore as never });
  return {
    tx,
    sendTransaction,
    getGasLimit,
    waitForTransactionReceipt,
    invalidateCache,
  };
};

type Fakes = ReturnType<typeof buildTx>;

const invokeTransaction = (
  fakes: Fakes,
  overrides: Record<string, unknown> = {},
) =>
  (fakes.tx as any).internalTransaction({
    getGasLimit: fakes.getGasLimit,
    sendTransaction: fakes.sendTransaction,
    ...overrides,
  }) as Promise<{ hash: Hash }>;

const mockReplacedBy = (fakes: Fakes, reason: ReplacementReason) => {
  const receipt = makeReceipt('success', REPLACEMENT_HASH);
  fakes.waitForTransactionReceipt.mockImplementation(async (args) => {
    (args.onReplaced as (r: unknown) => void)({
      reason,
      replacedTransaction: {},
      transaction: { hash: REPLACEMENT_HASH },
      transactionReceipt: receipt,
    });
    return receipt;
  });
};

const trackStages = () => {
  const stages: TransactionCallbackStage[] = [];
  const callback = vi.fn((props: TransactionCallbackProps) => {
    stages.push(props.stage);
  });
  return { stages, callback };
};

describe('TxSDK.internalTransaction (EOA / sendTransaction path)', () => {
  let fakes: Fakes;

  beforeEach(() => {
    fakes = buildTx();
  });

  it('resolves with the receipt hash, fires DONE and invalidates cache', async () => {
    fakes.waitForTransactionReceipt.mockResolvedValue(makeReceipt('success'));
    const { stages, callback } = trackStages();

    const result = await invokeTransaction(fakes, { callback });

    expect(result.hash).toBe(TX_HASH);
    expect(stages).toContain(TransactionCallbackStage.DONE);
    expect(fakes.invalidateCache).toHaveBeenCalledTimes(1);
  });

  it('rejects with TRANSACTION_REVERTED without DONE or cache invalidation', async () => {
    fakes.waitForTransactionReceipt.mockResolvedValue(makeReceipt('reverted'));
    const { stages, callback } = trackStages();

    await expect(invokeTransaction(fakes, { callback })).rejects.toMatchObject({
      code: ERROR_CODE.TRANSACTION_REVERTED,
    });
    expect(stages).not.toContain(TransactionCallbackStage.DONE);
    expect(fakes.invalidateCache).not.toHaveBeenCalled();
  });

  describe('replaced transaction', () => {
    it('rejects a cancelled transaction without DONE or cache invalidation', async () => {
      mockReplacedBy(fakes, 'cancelled');
      const { stages, callback } = trackStages();

      await expect(
        invokeTransaction(fakes, { callback }),
      ).rejects.toMatchObject({
        code: ERROR_CODE.TRANSACTION_ERROR,
        message: expect.stringContaining('cancelled'),
      });
      expect(stages).not.toContain(TransactionCallbackStage.DONE);
      expect(fakes.invalidateCache).not.toHaveBeenCalled();
    });

    it('rejects when the transaction was replaced with a different one', async () => {
      mockReplacedBy(fakes, 'replaced');
      await expect(invokeTransaction(fakes)).rejects.toBeInstanceOf(SDKError);
    });

    it('resolves when the replacement is only repriced', async () => {
      mockReplacedBy(fakes, 'repriced');
      const { stages, callback } = trackStages();
      const result = await invokeTransaction(fakes, { callback });
      expect(result.hash).toBe(REPLACEMENT_HASH);
      expect(fakes.invalidateCache).toHaveBeenCalledTimes(1);

      const confirmationCall = callback.mock.calls.find(
        ([props]) => props.stage === TransactionCallbackStage.CONFIRMATION,
      );
      const doneCall = callback.mock.calls.find(
        ([props]) => props.stage === TransactionCallbackStage.DONE,
      );
      expect(stages).toContain(TransactionCallbackStage.CONFIRMATION);
      expect(stages).toContain(TransactionCallbackStage.DONE);
      expect(confirmationCall?.[0].payload).toMatchObject({
        hash: REPLACEMENT_HASH,
      });
      expect(doneCall?.[0].payload).toMatchObject({ hash: REPLACEMENT_HASH });
    });

    it('still rejects when the caller passes its own onReplaced', async () => {
      mockReplacedBy(fakes, 'cancelled');
      const onReplaced = vi.fn();
      await expect(
        invokeTransaction(fakes, {
          waitForTransactionReceiptParameters: { onReplaced },
        }),
      ).rejects.toBeInstanceOf(SDKError);
      expect(onReplaced).toHaveBeenCalledTimes(1);
    });
  });
});
