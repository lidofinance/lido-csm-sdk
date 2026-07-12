export enum ERROR_CODE {
  // SDK-internal contexts
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  READ_ERROR = 'READ_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',

  // Wallet / provider — classified from viem error classes via classifyError.
  // Detection is spec-stable: each code maps to a viem class viem maintains.
  USER_REJECTED = 'USER_REJECTED', // viem UserRejectedRequestError (EIP-1193 code 4001)
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS', // viem InsufficientFundsError
  // Best-effort, NOT spec-stable like the rest of this bucket: EIP-1474 has no
  // dedicated "wallet timed out" code, so wallets report their own internal
  // timeouts as a generic -32603 with vendor-specific wording (e.g. "request
  // timed out"). Matched by a `details` regex — narrower/differently-worded
  // wallet timeouts will still fall through to WALLET_RPC_ERROR.
  WALLET_TIMEOUT = 'WALLET_TIMEOUT',
  WALLET_RPC_ERROR = 'WALLET_RPC_ERROR', // viem InternalRpcError (-32603) / InvalidInputRpcError (-32000)
  // Wallet/RPC provider is throttling requests: viem LimitExceededRpcError
  // (EIP-1474 code -32005). Consumer should back off and retry later.
  RATE_LIMITED = 'RATE_LIMITED',
  // Wallet exists but isn't authorized/unlocked yet: viem UnauthorizedProviderError
  // (EIP-1193 code 4100). Distinct from USER_REJECTED — nothing was declined,
  // the wallet needs to be unlocked/connected first.
  WALLET_UNAUTHORIZED = 'WALLET_UNAUTHORIZED',
  // Wallet doesn't implement the requested EIP-1193/5792 method: viem
  // UnsupportedProviderMethodError (code 4200). Common when probing capabilities
  // (e.g. sendCalls) on a wallet that predates EIP-5792.
  METHOD_NOT_SUPPORTED = 'METHOD_NOT_SUPPORTED',
  BUNDLE_NOT_FOUND = 'BUNDLE_NOT_FOUND', // viem UnknownBundleIdError (EIP-5792 code 5730)
  // A submitted EIP-5792 bundle id collides with one already in flight: viem
  // DuplicateIdError (code 5720). Retry with a fresh id.
  DUPLICATE_BUNDLE_ID = 'DUPLICATE_BUNDLE_ID',
  // Wallet can't/won't execute this EIP-5792 batch atomically as requested —
  // consumer should fall back to sequential calls or shrink the batch: viem
  // BundleTooLargeError (5740), AtomicityNotSupportedError (5760),
  // AtomicReadyWalletRejectedUpgradeError (5750, user declined the upgrade
  // prompt rather than the transaction itself).
  BATCH_NOT_ATOMIC = 'BATCH_NOT_ATOMIC',
  // Transient transport failures. Retryable from the consumer's perspective:
  // viem HttpRequestError, TimeoutError, WaitForCallsStatusTimeoutError,
  // WebSocketRequestError, RpcRequestError, SocketClosedError.
  NETWORK_ERROR = 'NETWORK_ERROR',
  // Wallet is connected to the wrong / unsupported chain — consumer should
  // prompt a chain switch: viem ChainMismatchError, ChainDisconnectedError,
  // ProviderDisconnectedError, SwitchChainError, UnsupportedChainIdError.
  CHAIN_MISMATCH = 'CHAIN_MISMATCH',

  // Transaction simulation / node errors — spec-stable in the same sense as
  // the wallet bucket above: viem parses well-known geth/erigon/anvil node
  // messages into these classes itself (see viem/errors/node.ts), we just
  // weren't classifying them yet.
  // viem NonceTooLowError, NonceTooHighError, NonceMaxValueError.
  NONCE_ERROR = 'NONCE_ERROR',
  // viem FeeCapTooHighError, FeeCapTooLowError, TipAboveFeeCapError.
  FEE_ERROR = 'FEE_ERROR',
  // viem IntrinsicGasTooHighError, IntrinsicGasTooLowError.
  GAS_ERROR = 'GAS_ERROR',

  // Contract / execution
  CONTRACT_REVERT = 'CONTRACT_REVERT', // revert with decodable selector — see SDKError.decodedRevert
  TRANSACTION_REVERTED = 'TRANSACTION_REVERTED', // tx mined, receipt status === 'reverted' (gas spent)
  EXECUTION_REVERTED = 'EXECUTION_REVERTED', // eth_call simulation reverted without decodable selector
  // Best-effort, NOT spec-stable: ERC-4337 EntryPoint reverts with a
  // conventional "AAxx <reason>" string (not ABI-decodable — see
  // decode-revert-data.ts), matched by prefix out of ExecutionRevertedError's
  // reason text. AA1x/AA2x = sender/account validation (signature, prefund,
  // deployment). Non-matching or non-standard bundler messages fall through
  // to EXECUTION_REVERTED.
  AA_VALIDATION_ERROR = 'AA_VALIDATION_ERROR',
  // ERC-4337 AA3x = paymaster validation/execution failure (deposit too low,
  // paymaster reverted, etc.). Same best-effort caveat as AA_VALIDATION_ERROR.
  AA_PAYMASTER_ERROR = 'AA_PAYMASTER_ERROR',
  // Tx mined & confirmed on-chain, but the caller-supplied `decodeResult`
  // callback threw. cause is a DecodeResultError carrying hash + receipt +
  // confirmations so consumers can still render success UI / retry decode.
  DECODE_RESULT_ERROR = 'DECODE_RESULT_ERROR',
}
