import type { Hash, WalletCallReceipt } from 'viem';
import type { WaitForCallsStatusReturnType } from 'viem/actions';
import type { ReceiptLike } from './types';

export type BatchCallReceipt = WalletCallReceipt<
  bigint,
  'success' | 'reverted'
>;

export type BatchCallStatus = WaitForCallsStatusReturnType;

export type BatchTransactionRevertedErrorData = {
  receipts: readonly BatchCallReceipt[];
  callStatus: BatchCallStatus;
};

/**
 * Thrown when an EIP-5792 batch call (sendCalls + waitForCallsStatus) yields
 * a reverted sub-call or no usable transaction hash. Wrapped as `cause` of an
 * SDKError so consumers can introspect per-call detail via the standard Error
 * chain.
 */
export class BatchTransactionRevertedError extends Error {
  public readonly receipts: readonly BatchCallReceipt[];
  public readonly callStatus: BatchCallStatus;
  public readonly revertedReceipts: readonly BatchCallReceipt[];

  constructor(message: string, data: BatchTransactionRevertedErrorData) {
    super(message);
    this.name = 'BatchTransactionRevertedError';
    this.receipts = data.receipts;
    this.callStatus = data.callStatus;
    this.revertedReceipts = data.receipts.filter(
      (r) => r.status === 'reverted',
    );
  }
}

export type DecodeResultErrorData = {
  hash: Hash;
  receipt: ReceiptLike;
  confirmations?: bigint;
  cause: unknown;
};

/**
 * Thrown when the caller-supplied `decodeResult` callback throws after the
 * transaction has already been mined and confirmed on-chain. Wrapped as
 * `cause` of an SDKError({ code: DECODE_RESULT_ERROR }) so consumers can
 * surface the hash + receipt + confirmations and retry decoding off-chain
 * instead of treating a successful tx as a failure.
 */
export class DecodeResultError extends Error {
  public readonly hash: Hash;
  public readonly receipt: ReceiptLike;
  public readonly confirmations: bigint | undefined;

  constructor(message: string, data: DecodeResultErrorData) {
    super(message, { cause: data.cause });
    this.name = 'DecodeResultError';
    this.hash = data.hash;
    this.receipt = data.receipt;
    this.confirmations = data.confirmations;
  }
}
