import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address, Hash, Hex, WalletCallReceipt } from 'viem';
import { TxSDK } from '../../../src/tx-sdk/tx-sdk';
import {
  TransactionCallbackStage,
  type TransactionCallbackProps,
} from '../../../src/tx-sdk/types';
import { ERROR_CODE, SDKError } from '../../../src/common/utils/sdk-error';

const ACCOUNT_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;
const TARGET_ADDRESS = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address;
const TX_HASH =
  '0x1111111111111111111111111111111111111111111111111111111111111111' as Hash;
const TX_HASH_2 =
  '0x2222222222222222222222222222222222222222222222222222222222222222' as Hash;
const CALL_ID = 'call-0xdeadbeef';
const CALLDATA = '0xabcdef' as Hex;

type FakeReceipt = WalletCallReceipt<bigint, 'success' | 'reverted'>;

const makeReceipt = (
  status: 'success' | 'reverted',
  transactionHash: Hash = TX_HASH,
): FakeReceipt =>
  ({
    status,
    transactionHash,
    blockHash: '0x' as Hash,
    blockNumber: 0n,
    gasUsed: 0n,
    logs: [],
  }) as unknown as FakeReceipt;

type CallStatus = {
  status: 'success' | 'failure' | 'pending';
  receipts?: FakeReceipt[];
};

const buildTx = () => {
  const sendCalls = vi.fn(async (_args: unknown) => ({ id: CALL_ID }));
  const waitForCallsStatus = vi.fn<(args: unknown) => Promise<CallStatus>>();
  const getTransactionConfirmations = vi.fn(async (_args: unknown) => 5n);
  const invalidateCache = vi.fn();

  const fakeCore = {
    core: {
      useAccount: async () => ({ address: ACCOUNT_ADDRESS }),
      error: (props: { code: ERROR_CODE; message: string }) =>
        new SDKError(props),
    },
    walletClient: {
      sendCalls,
      waitForCallsStatus,
    },
    publicClient: {
      getTransactionConfirmations,
    },
    invalidateCache,
  };

  const tx = new TxSDK({ core: fakeCore as never });
  return {
    tx,
    sendCalls,
    waitForCallsStatus,
    getTransactionConfirmations,
    invalidateCache,
  };
};

const invokeCall = (tx: TxSDK, overrides: Record<string, unknown> = {}) =>
  (tx as unknown as { internalCall: (props: unknown) => Promise<unknown> })
    .internalCall({
      calls: [{ to: TARGET_ADDRESS, data: CALLDATA }],
      ...overrides,
    });

describe('TxSDK.internalCall (AA / sendCalls path)', () => {
  let fakes: ReturnType<typeof buildTx>;

  beforeEach(() => {
    fakes = buildTx();
  });

  describe('happy path', () => {
    beforeEach(() => {
      fakes.waitForCallsStatus.mockResolvedValue({
        status: 'success',
        receipts: [makeReceipt('success', TX_HASH)],
      });
    });

    it('resolves with the on-chain receipt hash', async () => {
      const result = (await invokeCall(fakes.tx)) as { hash: Hash };
      expect(result.hash).toBe(TX_HASH);
    });

    it('forwards calls and experimental_fallback to sendCalls', async () => {
      await invokeCall(fakes.tx);
      expect(fakes.sendCalls).toHaveBeenCalledWith(
        expect.objectContaining({
          account: { address: ACCOUNT_ADDRESS },
          calls: [{ to: TARGET_ADDRESS, data: CALLDATA }],
          experimental_fallback: true,
        }),
      );
    });

    it('calls decodeResult with the receipt and surfaces its return value', async () => {
      const decodeResult = vi.fn(async (r: FakeReceipt) => ({
        decoded: r.transactionHash,
      }));
      const result = (await invokeCall(fakes.tx, { decodeResult })) as {
        result: { decoded: Hash };
      };
      expect(decodeResult).toHaveBeenCalledTimes(1);
      expect(result.result).toEqual({ decoded: TX_HASH });
    });

    it('invalidates SDK cache after success', async () => {
      await invokeCall(fakes.tx);
      expect(fakes.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('emits SIGN → RECEIPT → DONE callback sequence', async () => {
      const stages: TransactionCallbackStage[] = [];
      const callback = vi.fn((p: TransactionCallbackProps) => {
        stages.push(p.stage);
      });
      await invokeCall(fakes.tx, { callback });
      expect(stages).toEqual([
        TransactionCallbackStage.SIGN,
        TransactionCallbackStage.RECEIPT,
        TransactionCallbackStage.DONE,
      ]);
    });

    it('uses the LAST receipt hash for multi-call batches', async () => {
      fakes.waitForCallsStatus.mockResolvedValueOnce({
        status: 'success',
        receipts: [
          makeReceipt('success', TX_HASH),
          makeReceipt('success', TX_HASH_2),
        ],
      });
      const result = (await invokeCall(fakes.tx)) as { hash: Hash };
      expect(result.hash).toBe(TX_HASH_2);
    });
  });

  describe('AA quirk: batch reports failure but receipt is success', () => {
    // Regression test for the ERC-4337 paymaster post-op revert case.
    // The user's call succeeded on-chain but the bundler reports failure.
    it('resolves successfully and does NOT throw', async () => {
      fakes.waitForCallsStatus.mockResolvedValue({
        status: 'failure',
        receipts: [makeReceipt('success', TX_HASH)],
      });
      const result = (await invokeCall(fakes.tx)) as { hash: Hash };
      expect(result.hash).toBe(TX_HASH);
      expect(fakes.invalidateCache).toHaveBeenCalledTimes(1);
    });

    it('still calls decodeResult on the (successful) receipt', async () => {
      fakes.waitForCallsStatus.mockResolvedValue({
        status: 'failure',
        receipts: [makeReceipt('success', TX_HASH)],
      });
      const decodeResult = vi.fn(async () => 'decoded');
      const result = (await invokeCall(fakes.tx, { decodeResult })) as {
        result: string;
      };
      expect(decodeResult).toHaveBeenCalledTimes(1);
      expect(result.result).toBe('decoded');
    });
  });

  describe('genuine failures', () => {
    it('throws "Some operations were reverted" when any receipt has status reverted', async () => {
      fakes.waitForCallsStatus.mockResolvedValue({
        status: 'failure',
        receipts: [makeReceipt('reverted', TX_HASH)],
      });
      await expect(invokeCall(fakes.tx)).rejects.toMatchObject({
        code: ERROR_CODE.TRANSACTION_ERROR,
        message: expect.stringContaining('Some operations were reverted'),
      });
    });

    it('reverted-detection takes priority over batch-level success', async () => {
      // contradictory but exercises the per-receipt check
      fakes.waitForCallsStatus.mockResolvedValue({
        status: 'success',
        receipts: [makeReceipt('reverted', TX_HASH)],
      });
      await expect(invokeCall(fakes.tx)).rejects.toMatchObject({
        message: expect.stringContaining('Some operations were reverted'),
      });
    });

    it('throws "Transaction failed" when status=failure and receipts are empty', async () => {
      fakes.waitForCallsStatus.mockResolvedValue({
        status: 'failure',
        receipts: [],
      });
      await expect(invokeCall(fakes.tx)).rejects.toMatchObject({
        code: ERROR_CODE.TRANSACTION_ERROR,
        message: expect.stringContaining('Transaction failed'),
      });
    });

    it('throws "Transaction hash is missing" when status=success but receipts are absent', async () => {
      fakes.waitForCallsStatus.mockResolvedValue({ status: 'success' });
      await expect(invokeCall(fakes.tx)).rejects.toMatchObject({
        code: ERROR_CODE.TRANSACTION_ERROR,
        message: expect.stringContaining('Transaction hash is missing'),
      });
    });

    it('does not invalidate cache or fire DONE callback on failure', async () => {
      fakes.waitForCallsStatus.mockResolvedValue({
        status: 'failure',
        receipts: [makeReceipt('reverted')],
      });
      const stages: TransactionCallbackStage[] = [];
      const callback = vi.fn((p: TransactionCallbackProps) => {
        stages.push(p.stage);
      });
      await expect(invokeCall(fakes.tx, { callback })).rejects.toBeDefined();
      expect(fakes.invalidateCache).not.toHaveBeenCalled();
      expect(stages).not.toContain(TransactionCallbackStage.DONE);
    });
  });
});
