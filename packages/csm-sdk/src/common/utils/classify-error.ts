import {
  AtomicityNotSupportedError,
  AtomicReadyWalletRejectedUpgradeError,
  BaseError,
  BundleTooLargeError,
  ChainDisconnectedError,
  ChainMismatchError,
  DuplicateIdError,
  ExecutionRevertedError,
  FeeCapTooHighError,
  FeeCapTooLowError,
  HttpRequestError,
  InsufficientFundsError,
  IntrinsicGasTooHighError,
  IntrinsicGasTooLowError,
  InternalRpcError,
  InvalidInputRpcError,
  LimitExceededRpcError,
  NonceMaxValueError,
  NonceTooHighError,
  NonceTooLowError,
  ProviderDisconnectedError,
  RpcRequestError,
  SocketClosedError,
  SwitchChainError,
  TimeoutError,
  TipAboveFeeCapError,
  TransactionTypeNotSupportedError,
  UnauthorizedProviderError,
  UnknownBundleIdError,
  UnsupportedChainIdError,
  UnsupportedProviderMethodError,
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

// EIP-1474 has no dedicated "wallet timed out" code — wallets report their
// own internal timeouts as a generic -32603/-32000 with vendor-specific
// wording. Best-effort only: matches common phrasings ("timeout", "timed
// out", "time out"); differently-worded wallet timeouts fall through to
// WALLET_RPC_ERROR instead. Not spec-stable like the other classifiers below.
const WALLET_TIMEOUT_PATTERN = /timed?\s*out/i;

// ERC-4337 EntryPoint reverts with a conventional "AAxx <reason>" string —
// not ABI-decodable (see decode-revert-data.ts), but the "AAxx" prefix
// convention is defined by the ERC itself, not a wallet vendor, so it's a
// firmer signal than a typical message heuristic. viem surfaces it as an
// ExecutionRevertedError whose shortMessage embeds the raw reason text.
// AA1x = factory/sender deployment, AA2x = account validation (signature,
// prefund). Best-effort: non-conforming bundlers still fall through to
// EXECUTION_REVERTED.
const AA_VALIDATION_PATTERN = /\bAA[1-2]\d\b/;
// AA3x = paymaster validation/execution failure (deposit too low, paymaster
// reverted post-op, etc.).
const AA_PAYMASTER_PATTERN = /\bAA3\d\b/;

const aaReasonOf = (e: ExecutionRevertedError): string => e.shortMessage;

// Ordered most-specific → most-generic: a UserRejectedRequestError wrapped
// inside an InternalRpcError must still classify as USER_REJECTED. CHAIN_MISMATCH
// precedes EXECUTION_REVERTED — a wallet on the wrong chain may surface an
// execution revert under the hood, but the chain issue is the actionable root.
// The AA_* buckets precede the generic EXECUTION_REVERTED bucket, and
// WALLET_TIMEOUT precedes the generic WALLET_RPC_ERROR bucket, for the same
// reason — each must win before its catch-all superclass match claims it.
const CLASSIFIERS: Array<[(e: unknown) => boolean, ERROR_CODE]> = [
  [(e) => e instanceof UserRejectedRequestError, ERROR_CODE.USER_REJECTED],
  [(e) => e instanceof UnknownBundleIdError, ERROR_CODE.BUNDLE_NOT_FOUND],
  [(e) => e instanceof DuplicateIdError, ERROR_CODE.DUPLICATE_BUNDLE_ID],
  [
    (e) =>
      e instanceof BundleTooLargeError ||
      e instanceof AtomicityNotSupportedError ||
      e instanceof AtomicReadyWalletRejectedUpgradeError,
    ERROR_CODE.BATCH_NOT_ATOMIC,
  ],
  [
    (e) => e instanceof UnauthorizedProviderError,
    ERROR_CODE.WALLET_UNAUTHORIZED,
  ],
  [
    (e) => e instanceof UnsupportedProviderMethodError,
    ERROR_CODE.METHOD_NOT_SUPPORTED,
  ],
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
  [(e) => e instanceof LimitExceededRpcError, ERROR_CODE.RATE_LIMITED],
  [(e) => e instanceof InsufficientFundsError, ERROR_CODE.INSUFFICIENT_FUNDS],
  [
    (e) =>
      e instanceof NonceTooLowError ||
      e instanceof NonceTooHighError ||
      e instanceof NonceMaxValueError,
    ERROR_CODE.NONCE_ERROR,
  ],
  [
    (e) =>
      e instanceof FeeCapTooHighError ||
      e instanceof FeeCapTooLowError ||
      e instanceof TipAboveFeeCapError,
    ERROR_CODE.FEE_ERROR,
  ],
  [
    (e) =>
      e instanceof IntrinsicGasTooHighError ||
      e instanceof IntrinsicGasTooLowError,
    ERROR_CODE.GAS_ERROR,
  ],
  [
    (e) => e instanceof TransactionTypeNotSupportedError,
    ERROR_CODE.NOT_SUPPORTED,
  ],
  [
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      (e as { name?: unknown }).name === TX_RECEIPT_REVERTED_NAME,
    ERROR_CODE.TRANSACTION_REVERTED,
  ],
  [
    (e) =>
      e instanceof ExecutionRevertedError &&
      AA_VALIDATION_PATTERN.test(aaReasonOf(e)),
    ERROR_CODE.AA_VALIDATION_ERROR,
  ],
  [
    (e) =>
      e instanceof ExecutionRevertedError &&
      AA_PAYMASTER_PATTERN.test(aaReasonOf(e)),
    ERROR_CODE.AA_PAYMASTER_ERROR,
  ],
  [(e) => e instanceof ExecutionRevertedError, ERROR_CODE.EXECUTION_REVERTED],
  [
    (e) =>
      (e instanceof InternalRpcError || e instanceof InvalidInputRpcError) &&
      WALLET_TIMEOUT_PATTERN.test(e.details ?? ''),
    ERROR_CODE.WALLET_TIMEOUT,
  ],
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
