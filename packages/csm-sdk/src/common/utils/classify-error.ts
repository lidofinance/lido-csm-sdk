import {
  BaseError,
  ChainDisconnectedError,
  ChainMismatchError,
  ExecutionRevertedError,
  HttpRequestError,
  InsufficientFundsError,
  InternalRpcError,
  InvalidInputRpcError,
  ProviderDisconnectedError,
  RpcRequestError,
  SocketClosedError,
  SwitchChainError,
  TimeoutError,
  UnknownBundleIdError,
  UnsupportedChainIdError,
  UserRejectedRequestError,
  WaitForCallsStatusTimeoutError,
  WebSocketRequestError,
} from 'viem';
import type { DecodedRevert } from './decode-revert-data';
import { ERROR_CODE } from './sdk-error-code';

// viem doesn't re-export TransactionReceiptRevertedError from its top-level
// entry, so `instanceof` is unavailable — match by `name`, which viem sets
// explicitly. Thrown only by sendTransactionSync / sendRawTransactionSync.
const TX_RECEIPT_REVERTED_NAME = 'TransactionReceiptRevertedError';

// Ordered most-specific → most-generic: a UserRejectedRequestError wrapped
// inside an InternalRpcError must still classify as USER_REJECTED. CHAIN_MISMATCH
// precedes EXECUTION_REVERTED — a wallet on the wrong chain may surface an
// execution revert under the hood, but the chain issue is the actionable root.
const CLASSIFIERS: Array<[(e: unknown) => boolean, ERROR_CODE]> = [
  [(e) => e instanceof UserRejectedRequestError, ERROR_CODE.USER_REJECTED],
  [(e) => e instanceof UnknownBundleIdError, ERROR_CODE.BUNDLE_NOT_FOUND],
  [
    (e) =>
      e instanceof ChainMismatchError ||
      e instanceof ChainDisconnectedError ||
      e instanceof ProviderDisconnectedError ||
      e instanceof SwitchChainError ||
      e instanceof UnsupportedChainIdError,
    ERROR_CODE.CHAIN_MISMATCH,
  ],
  [
    (e) =>
      e instanceof HttpRequestError ||
      e instanceof TimeoutError ||
      e instanceof WaitForCallsStatusTimeoutError ||
      e instanceof WebSocketRequestError ||
      e instanceof RpcRequestError ||
      e instanceof SocketClosedError,
    ERROR_CODE.NETWORK_ERROR,
  ],
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
