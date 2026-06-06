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

// viem doesn't re-export TransactionReceiptRevertedError from its top-level
// entry, so `instanceof` is unavailable — match by `name`, which viem sets
// explicitly. Thrown only by sendTransactionSync / sendRawTransactionSync.
const TX_RECEIPT_REVERTED_NAME = 'TransactionReceiptRevertedError';

// Ordered most-specific → most-generic: a UserRejectedRequestError wrapped
// inside an InternalRpcError must still classify as USER_REJECTED.
const CLASSIFIERS: Array<[(e: unknown) => boolean, ERROR_CODE]> = [
  [(e) => e instanceof UserRejectedRequestError, ERROR_CODE.USER_REJECTED],
  [(e) => e instanceof UnknownBundleIdError, ERROR_CODE.BUNDLE_NOT_FOUND],
  [(e) => e instanceof InsufficientFundsError, ERROR_CODE.INSUFFICIENT_FUNDS],
  [
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      (e as { name?: unknown }).name === TX_RECEIPT_REVERTED_NAME,
    ERROR_CODE.TRANSACTION_REVERTED,
  ],
  [(e) => e instanceof ExecutionRevertedError, ERROR_CODE.EXECUTION_REVERTED],
  [
    (e) => e instanceof InternalRpcError || e instanceof InvalidInputRpcError,
    ERROR_CODE.WALLET_RPC_ERROR,
  ],
];

export const classifyError = (
  error: unknown,
  decodedRevert: DecodedRevert | undefined,
): ERROR_CODE | undefined => {
  if (decodedRevert) return ERROR_CODE.CONTRACT_REVERT;
  if (!(error instanceof BaseError)) return undefined;

  for (const [match, code] of CLASSIFIERS) {
    if (error.walk(match)) return code;
  }
  return undefined;
};
