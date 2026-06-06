import {
  BaseError,
  ExecutionRevertedError,
  InsufficientFundsError,
  InternalRpcError,
  InvalidInputRpcError,
  UnknownBundleIdError,
  UserRejectedRequestError,
} from 'viem';
import type { DecodedRevert } from './decode-revert-data';
import { ERROR_CODE } from './sdk-error-code';

// viem does not re-export TransactionReceiptRevertedError from its top-level
// entry, so `instanceof` is unavailable. Detection is by `error.name`, which
// viem sets explicitly on the class (transaction.js: this.name = '…') and is
// thrown only by sendTransactionSync / sendRawTransactionSync.
const TX_RECEIPT_REVERTED_NAME = 'TransactionReceiptRevertedError';

const isTxReceiptReverted = (e: unknown): boolean =>
  typeof e === 'object' &&
  e !== null &&
  (e as { name?: unknown }).name === TX_RECEIPT_REVERTED_NAME;

// Walks the full cause chain. Order is most-specific → most-generic:
// a wallet that wraps a 4001 inside a -32603 must classify as USER_REJECTED.
// Returns undefined when the error is not a viem BaseError or no known class
// is found in the chain — the caller falls back to UNKNOWN_ERROR or an
// explicitly supplied code.
export const classifyError = (
  error: unknown,
  decodedRevert: DecodedRevert | undefined,
): ERROR_CODE | undefined => {
  if (decodedRevert) return ERROR_CODE.CONTRACT_REVERT;
  if (!(error instanceof BaseError)) return undefined;

  if (error.walk((e) => e instanceof UserRejectedRequestError)) {
    return ERROR_CODE.USER_REJECTED;
  }
  if (error.walk((e) => e instanceof UnknownBundleIdError)) {
    return ERROR_CODE.BUNDLE_NOT_FOUND;
  }
  if (error.walk((e) => e instanceof InsufficientFundsError)) {
    return ERROR_CODE.INSUFFICIENT_FUNDS;
  }
  if (error.walk(isTxReceiptReverted)) {
    return ERROR_CODE.TRANSACTION_REVERTED;
  }
  if (error.walk((e) => e instanceof ExecutionRevertedError)) {
    return ERROR_CODE.EXECUTION_REVERTED;
  }
  if (
    error.walk(
      (e) => e instanceof InternalRpcError || e instanceof InvalidInputRpcError,
    )
  ) {
    return ERROR_CODE.WALLET_RPC_ERROR;
  }

  return undefined;
};
