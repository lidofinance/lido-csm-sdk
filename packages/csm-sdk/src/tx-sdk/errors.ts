import type { WalletCallReceipt } from 'viem';
import type { WaitForCallsStatusReturnType } from 'viem/actions';

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
