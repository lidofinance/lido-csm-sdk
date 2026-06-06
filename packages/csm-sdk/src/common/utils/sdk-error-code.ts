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
  WALLET_RPC_ERROR = 'WALLET_RPC_ERROR', // viem InternalRpcError (-32603) / InvalidInputRpcError (-32000)
  BUNDLE_NOT_FOUND = 'BUNDLE_NOT_FOUND', // viem UnknownBundleIdError (EIP-5792 code 5730)
  // Transient transport failures. Retryable from the consumer's perspective:
  // viem HttpRequestError, TimeoutError, WaitForCallsStatusTimeoutError,
  // WebSocketRequestError, RpcRequestError, SocketClosedError.
  NETWORK_ERROR = 'NETWORK_ERROR',
  // Wallet is connected to the wrong / unsupported chain — consumer should
  // prompt a chain switch: viem ChainMismatchError, ChainDisconnectedError,
  // ProviderDisconnectedError, SwitchChainError, UnsupportedChainIdError.
  CHAIN_MISMATCH = 'CHAIN_MISMATCH',

  // Contract / execution
  CONTRACT_REVERT = 'CONTRACT_REVERT', // revert with decodable selector — see SDKError.decodedRevert
  TRANSACTION_REVERTED = 'TRANSACTION_REVERTED', // tx mined, receipt status === 'reverted' (gas spent)
  EXECUTION_REVERTED = 'EXECUTION_REVERTED', // eth_call simulation reverted without decodable selector
  // Tx mined & confirmed on-chain, but the caller-supplied `decodeResult`
  // callback threw. cause is a DecodeResultError carrying hash + receipt +
  // confirmations so consumers can still render success UI / retry decode.
  DECODE_RESULT_ERROR = 'DECODE_RESULT_ERROR',
}
