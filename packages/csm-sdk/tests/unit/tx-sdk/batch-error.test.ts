import { describe, it, expect } from 'vitest';
import type { Hash, Hex, WalletCallReceipt } from 'viem';
import {
  BatchTransactionRevertedError,
  DecodeResultError,
  type BatchCallStatus,
} from '../../../src/tx-sdk/errors';
import { ERROR_CODE, SDKError } from '../../../src/common/utils/sdk-error';

type FakeReceipt = WalletCallReceipt<bigint, 'success' | 'reverted'>;

const makeReceipt = (
  status: 'success' | 'reverted',
  transactionHash: Hash = '0x1' as Hash,
): FakeReceipt =>
  ({
    status,
    transactionHash,
    blockHash: '0x' as Hex,
    blockNumber: 0n,
    gasUsed: 0n,
    logs: [],
  }) as unknown as FakeReceipt;

const makeStatus = (
  receipts: FakeReceipt[],
  status: BatchCallStatus['status'] = 'failure',
): BatchCallStatus =>
  ({
    id: '0xdeadbeef',
    status,
    statusCode: 500,
    atomic: true,
    chainId: 1,
    version: '2.0.0',
    receipts,
  }) as unknown as BatchCallStatus;

describe('BatchTransactionRevertedError', () => {
  it('stores receipts and callStatus, and filters revertedReceipts', () => {
    const receipts = [
      makeReceipt('success', '0xaa' as Hash),
      makeReceipt('reverted', '0xbb' as Hash),
      makeReceipt('reverted', '0xcc' as Hash),
    ];
    const callStatus = makeStatus(receipts);

    const err = new BatchTransactionRevertedError('boom', {
      receipts,
      callStatus,
    });

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('BatchTransactionRevertedError');
    expect(err.message).toBe('boom');
    expect(err.receipts).toBe(receipts);
    expect(err.callStatus).toBe(callStatus);
    expect(err.revertedReceipts).toHaveLength(2);
    expect(err.revertedReceipts.every((r) => r.status === 'reverted')).toBe(
      true,
    );
  });

  it('produces empty revertedReceipts when none reverted', () => {
    const receipts = [makeReceipt('success'), makeReceipt('success')];
    const err = new BatchTransactionRevertedError('hash missing', {
      receipts,
      callStatus: makeStatus(receipts, 'success'),
    });
    expect(err.revertedReceipts).toEqual([]);
  });

  it('handles empty receipts array', () => {
    const callStatus = makeStatus([], 'failure');
    const err = new BatchTransactionRevertedError('failed', {
      receipts: [],
      callStatus,
    });
    expect(err.receipts).toEqual([]);
    expect(err.revertedReceipts).toEqual([]);
    expect(err.callStatus).toBe(callStatus);
  });

  it('survives as SDKError.cause and is consumer-discoverable', () => {
    const receipts = [
      makeReceipt('success', '0xaa' as Hash),
      makeReceipt('reverted', '0xbb' as Hash),
    ];
    const callStatus = makeStatus(receipts);
    const batchErr = new BatchTransactionRevertedError('reverted', {
      receipts,
      callStatus,
    });
    const sdkErr = new SDKError({
      code: ERROR_CODE.TRANSACTION_ERROR,
      error: batchErr,
      message: batchErr.message,
    });

    expect(sdkErr.cause).toBe(batchErr);
    expect(sdkErr.cause).toBeInstanceOf(BatchTransactionRevertedError);

    // Consumer extraction pattern: narrow cause, then enumerate failed indices.
    const cause = sdkErr.cause;
    const isBatchErr = cause instanceof BatchTransactionRevertedError;
    expect(isBatchErr).toBe(true);
    const narrowed = cause as BatchTransactionRevertedError;
    const failedIndices = narrowed.revertedReceipts.map((r) =>
      narrowed.receipts.indexOf(r),
    );
    expect(failedIndices).toEqual([1]);
  });
});

describe('DecodeResultError', () => {
  const HASH = '0xabc' as Hash;
  const receipt = makeReceipt('success', HASH);

  it('stores hash, receipt, confirmations and preserves cause', () => {
    const inner = new Error('bad parse');
    const err = new DecodeResultError('bad parse', {
      hash: HASH,
      receipt,
      confirmations: 5n,
      cause: inner,
    });

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DecodeResultError');
    expect(err.message).toBe('bad parse');
    expect(err.hash).toBe(HASH);
    expect(err.receipt).toBe(receipt);
    expect(err.confirmations).toBe(5n);
    expect(err.cause).toBe(inner);
  });

  it('allows undefined confirmations', () => {
    const err = new DecodeResultError('boom', {
      hash: HASH,
      receipt,
      cause: new Error('boom'),
    });
    expect(err.confirmations).toBeUndefined();
  });

  it('survives as SDKError.cause with DECODE_RESULT_ERROR code', () => {
    const decodeErr = new DecodeResultError('bad', {
      hash: HASH,
      receipt,
      confirmations: 1n,
      cause: new Error('bad'),
    });
    const sdkErr = new SDKError({
      code: ERROR_CODE.DECODE_RESULT_ERROR,
      error: decodeErr,
      message: decodeErr.message,
    });

    expect(sdkErr.code).toBe(ERROR_CODE.DECODE_RESULT_ERROR);
    expect(sdkErr.cause).toBe(decodeErr);
    // Consumer extraction pattern: narrow cause, pull hash for explorer link.
    const cause = sdkErr.cause;
    expect(cause).toBeInstanceOf(DecodeResultError);
    expect((cause as DecodeResultError).hash).toBe(HASH);
  });
});
