import { describe, it, expect } from 'vitest';
import {
  AtomicityNotSupportedError,
  AtomicReadyWalletRejectedUpgradeError,
  BaseError,
  BundleTooLargeError,
  ChainDisconnectedError,
  ChainMismatchError,
  DuplicateIdError,
  encodeErrorResult,
  ExecutionRevertedError,
  FeeCapTooHighError,
  FeeCapTooLowError,
  Hex,
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
  TransactionExecutionError,
  TransactionTypeNotSupportedError,
  UnauthorizedProviderError,
  UnknownBundleIdError,
  UnsupportedChainIdError,
  UnsupportedProviderMethodError,
  UserRejectedRequestError,
  WaitForCallsStatusTimeoutError,
  WebSocketRequestError,
} from 'viem';

// viem doesn't re-export TransactionReceiptRevertedError from its top-level
// entry. Construct an equivalent BaseError with the matching `name` — that's
// the same surface classify-error walks for.
const makeTxReceiptRevertedError = (message = 'reverted'): BaseError => {
  const err = new BaseError(message);
  Object.defineProperty(err, 'name', {
    value: 'TransactionReceiptRevertedError',
  });
  return err;
};
import { AccountingAbi } from '../../src/abi/Accounting';
import { classifyError } from '../../src/common/utils/classify-error';
import { ERROR_CODE } from '../../src/common/utils/sdk-error-code';
import { SDKError } from '../../src/common/utils/sdk-error';
import { decodeRevertData } from '../../src/common/utils/decode-revert-data';

const encodeKnownError = (name: string, args?: unknown[]): Hex =>
  encodeErrorResult({
    abi: AccountingAbi,
    errorName: name,
    args,
  } as Parameters<typeof encodeErrorResult>[0]);

const wrap = (cause: Error, message = 'outer'): BaseError =>
  new BaseError(message, { cause });

describe('classifyError', () => {
  it('returns undefined for non-BaseError inputs', () => {
    expect(classifyError(new Error('plain'), undefined)).toBeUndefined();
    expect(classifyError('string', undefined)).toBeUndefined();
    expect(classifyError(null, undefined)).toBeUndefined();
  });

  it('CONTRACT_REVERT when decodedRevert is set', () => {
    expect(
      classifyError(undefined, { name: 'FailedToSendEther', args: [] }),
    ).toBe(ERROR_CODE.CONTRACT_REVERT);
  });

  it('USER_REJECTED from UserRejectedRequestError', () => {
    const err = wrap(new UserRejectedRequestError(new Error('cancelled')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.USER_REJECTED);
  });

  it('BUNDLE_NOT_FOUND from UnknownBundleIdError', () => {
    const err = wrap(new UnknownBundleIdError(new Error('gone')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.BUNDLE_NOT_FOUND);
  });

  it('DUPLICATE_BUNDLE_ID from DuplicateIdError', () => {
    const err = wrap(new DuplicateIdError(new Error('5720')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.DUPLICATE_BUNDLE_ID);
  });

  it('BATCH_NOT_ATOMIC from BundleTooLargeError', () => {
    const err = wrap(new BundleTooLargeError(new Error('5740')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.BATCH_NOT_ATOMIC);
  });

  it('BATCH_NOT_ATOMIC from AtomicityNotSupportedError', () => {
    const err = wrap(new AtomicityNotSupportedError(new Error('5760')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.BATCH_NOT_ATOMIC);
  });

  it('BATCH_NOT_ATOMIC from AtomicReadyWalletRejectedUpgradeError', () => {
    const err = wrap(
      new AtomicReadyWalletRejectedUpgradeError(new Error('5750')),
    );
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.BATCH_NOT_ATOMIC);
  });

  it('WALLET_UNAUTHORIZED from UnauthorizedProviderError', () => {
    const err = wrap(new UnauthorizedProviderError(new Error('4100')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.WALLET_UNAUTHORIZED);
  });

  it('METHOD_NOT_SUPPORTED from UnsupportedProviderMethodError', () => {
    const err = wrap(new UnsupportedProviderMethodError(new Error('4200')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.METHOD_NOT_SUPPORTED);
  });

  it('RATE_LIMITED from LimitExceededRpcError', () => {
    const err = wrap(new LimitExceededRpcError(new Error('-32005')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.RATE_LIMITED);
  });

  it('INSUFFICIENT_FUNDS from InsufficientFundsError', () => {
    const err = wrap(new InsufficientFundsError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.INSUFFICIENT_FUNDS);
  });

  // viem parses these directly from geth/erigon/anvil node messages (see
  // viem/errors/node.ts) — same spec-stable footing as InsufficientFundsError
  // above, just not wired up until now.
  it('NONCE_ERROR from NonceTooLowError', () => {
    const err = wrap(new NonceTooLowError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NONCE_ERROR);
  });

  it('NONCE_ERROR from NonceTooHighError', () => {
    const err = wrap(new NonceTooHighError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NONCE_ERROR);
  });

  it('NONCE_ERROR from NonceMaxValueError', () => {
    const err = wrap(new NonceMaxValueError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NONCE_ERROR);
  });

  it('FEE_ERROR from FeeCapTooHighError', () => {
    const err = wrap(new FeeCapTooHighError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.FEE_ERROR);
  });

  it('FEE_ERROR from FeeCapTooLowError', () => {
    const err = wrap(new FeeCapTooLowError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.FEE_ERROR);
  });

  it('FEE_ERROR from TipAboveFeeCapError', () => {
    const err = wrap(new TipAboveFeeCapError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.FEE_ERROR);
  });

  it('GAS_ERROR from IntrinsicGasTooHighError', () => {
    const err = wrap(new IntrinsicGasTooHighError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.GAS_ERROR);
  });

  it('GAS_ERROR from IntrinsicGasTooLowError', () => {
    const err = wrap(new IntrinsicGasTooLowError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.GAS_ERROR);
  });

  it('NOT_SUPPORTED from TransactionTypeNotSupportedError', () => {
    const err = wrap(new TransactionTypeNotSupportedError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NOT_SUPPORTED);
  });

  it('TRANSACTION_REVERTED from TransactionReceiptRevertedError', () => {
    const err = makeTxReceiptRevertedError();
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.TRANSACTION_REVERTED);
  });

  it('EXECUTION_REVERTED from ExecutionRevertedError (no decode)', () => {
    const err = wrap(new ExecutionRevertedError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.EXECUTION_REVERTED);
  });

  // ERC-4337 EntryPoint reverts aren't ABI-decodable against our known
  // contract ABIs (see decode-revert-data.ts), so they'd otherwise collapse
  // to the generic EXECUTION_REVERTED. The "AAxx" prefix is defined by the
  // ERC itself, not a wallet vendor — firmer ground than a typical heuristic.
  it('AA_VALIDATION_ERROR from an ExecutionRevertedError with an AA2x reason', () => {
    const err = wrap(
      new ExecutionRevertedError({
        message: "execution reverted: AA21 didn't pay prefund",
      }),
    );
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.AA_VALIDATION_ERROR);
  });

  it('AA_PAYMASTER_ERROR from an ExecutionRevertedError with an AA3x reason', () => {
    const err = wrap(
      new ExecutionRevertedError({
        message: 'execution reverted: AA31 paymaster deposit too low',
      }),
    );
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.AA_PAYMASTER_ERROR);
  });

  // Non-conforming / non-AA revert reasons fall through to the generic
  // bucket — this is the documented trade-off of a best-effort match.
  it('EXECUTION_REVERTED when the reason has no AAxx prefix', () => {
    const err = wrap(
      new ExecutionRevertedError({
        message: 'execution reverted: ERC20: transfer amount exceeds balance',
      }),
    );
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.EXECUTION_REVERTED);
  });

  it('WALLET_RPC_ERROR from InternalRpcError', () => {
    const err = wrap(new InternalRpcError(new Error('-32603')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.WALLET_RPC_ERROR);
  });

  // Real-world shape: a wallet's own internal timeout still surfaces as a
  // generic -32603 (EIP-1474 has no dedicated "wallet timed out" code), not
  // as viem's transport-level TimeoutError — NETWORK_ERROR is reserved for
  // viem's own transport never getting a response, a different failure than
  // the wallet responding with an error object. The vendor-specific "request
  // timed out" wording in `details` is enough to earn the more specific
  // WALLET_TIMEOUT over the generic WALLET_RPC_ERROR bucket.
  it('WALLET_TIMEOUT from a wallet-timeout InternalRpcError wrapped in TransactionExecutionError', () => {
    const inner = new InternalRpcError(
      new Error('CSM Dev Wallet: request timed out'),
    );
    const err = new TransactionExecutionError(inner, { account: null });
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.WALLET_TIMEOUT);
  });

  // Differently-worded wallet timeout messages aren't caught by the regex —
  // this is the documented trade-off of a best-effort, non-spec-stable match.
  it('WALLET_RPC_ERROR when the timeout wording does not match the pattern', () => {
    const err = wrap(
      new InternalRpcError(new Error('operation did not complete in time')),
    );
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.WALLET_RPC_ERROR);
  });

  it('WALLET_TIMEOUT from InvalidInputRpcError with timeout wording', () => {
    const err = wrap(new InvalidInputRpcError(new Error('Request Timeout')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.WALLET_TIMEOUT);
  });

  it('WALLET_RPC_ERROR from InvalidInputRpcError', () => {
    const err = wrap(new InvalidInputRpcError(new Error('-32000')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.WALLET_RPC_ERROR);
  });

  it('NETWORK_ERROR from HttpRequestError', () => {
    const err = wrap(new HttpRequestError({ url: 'https://rpc.example/' }));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NETWORK_ERROR);
  });

  it('NETWORK_ERROR from TimeoutError', () => {
    const err = wrap(
      new TimeoutError({
        body: { method: 'eth_call' },
        url: 'https://rpc.example/',
      }),
    );
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NETWORK_ERROR);
  });

  it('NETWORK_ERROR from WaitForCallsStatusTimeoutError', () => {
    const err = wrap(new WaitForCallsStatusTimeoutError({ id: '0xdead' }));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NETWORK_ERROR);
  });

  it('NETWORK_ERROR from WebSocketRequestError', () => {
    const err = wrap(new WebSocketRequestError({ url: 'wss://rpc.example/' }));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NETWORK_ERROR);
  });

  it('NETWORK_ERROR from RpcRequestError', () => {
    const err = wrap(
      new RpcRequestError({
        body: { method: 'eth_call' },
        error: { code: -32_000, message: 'rpc' },
        url: 'https://rpc.example/',
      }),
    );
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NETWORK_ERROR);
  });

  it('NETWORK_ERROR from SocketClosedError', () => {
    const err = wrap(new SocketClosedError({ url: 'wss://rpc.example/' }));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.NETWORK_ERROR);
  });

  it('CHAIN_MISMATCH from ChainMismatchError', () => {
    const chain = {
      id: 1,
      name: 'mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [] } },
    };
    const err = wrap(
      new ChainMismatchError({
        chain: chain as ConstructorParameters<
          typeof ChainMismatchError
        >[0]['chain'],
        currentChainId: 5,
      }),
    );
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.CHAIN_MISMATCH);
  });

  it('CHAIN_MISMATCH from ChainDisconnectedError', () => {
    const err = wrap(new ChainDisconnectedError(new Error('4901')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.CHAIN_MISMATCH);
  });

  it('CHAIN_MISMATCH from ProviderDisconnectedError', () => {
    const err = wrap(new ProviderDisconnectedError(new Error('4900')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.CHAIN_MISMATCH);
  });

  it('CHAIN_MISMATCH from SwitchChainError', () => {
    const err = wrap(new SwitchChainError(new Error('4902')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.CHAIN_MISMATCH);
  });

  it('CHAIN_MISMATCH from UnsupportedChainIdError', () => {
    const err = wrap(new UnsupportedChainIdError(new Error('5710')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.CHAIN_MISMATCH);
  });

  // Intent beats transport: a rejection surfaced through a transient
  // HttpRequestError must classify as USER_REJECTED, not NETWORK_ERROR.
  it('USER_REJECTED wins when wrapped inside HttpRequestError', () => {
    const inner = new UserRejectedRequestError(new Error('cancelled'));
    const outer = new HttpRequestError({
      cause: inner,
      url: 'https://rpc.example/',
    });
    const wrapped = wrap(outer);
    expect(classifyError(wrapped, undefined)).toBe(ERROR_CODE.USER_REJECTED);
  });

  // Wallets often wrap a 4001 inside a -32603. USER_REJECTED must win over
  // WALLET_RPC_ERROR — the specific intent beats the transport-level wrapper.
  it('USER_REJECTED wins when wrapped inside InternalRpcError', () => {
    const inner = new UserRejectedRequestError(new Error('cancelled'));
    const outer = new InternalRpcError(inner);
    const wrapped = wrap(outer);
    expect(classifyError(wrapped, undefined)).toBe(ERROR_CODE.USER_REJECTED);
  });

  // Decoded revert beats raw ExecutionRevertedError.
  it('CONTRACT_REVERT wins over EXECUTION_REVERTED', () => {
    const err = wrap(new ExecutionRevertedError({}));
    expect(classifyError(err, { name: 'FailedToSendEther', args: [] })).toBe(
      ERROR_CODE.CONTRACT_REVERT,
    );
  });
});

describe('SDKError.from + classifier integration', () => {
  it('stamps USER_REJECTED automatically', () => {
    const err = wrap(new UserRejectedRequestError(new Error('cancelled')));
    expect(SDKError.from(err).code).toBe(ERROR_CODE.USER_REJECTED);
  });

  it('stamps CONTRACT_REVERT when revert is decodable', () => {
    const data = encodeKnownError('FailedToSendEther');
    const err = Object.assign(new BaseError('reverted'), { data });
    const sdkError = SDKError.from(err);
    expect(sdkError.code).toBe(ERROR_CODE.CONTRACT_REVERT);
    expect(sdkError.decodedRevert?.name).toBe('FailedToSendEther');
  });

  // Confirms decodeRevertData and classifyError agree on the same data path.
  it('decodeRevertData drives CONTRACT_REVERT classification', () => {
    const data = encodeKnownError('FailedToSendEther');
    const err = Object.assign(new BaseError('reverted'), { data });
    const decoded = decodeRevertData(err);
    expect(decoded).toBeDefined();
    expect(classifyError(err, decoded)).toBe(ERROR_CODE.CONTRACT_REVERT);
  });

  // Classifier wins over caller-supplied context code: a TRANSACTION_ERROR
  // call site that surfaces a UserRejectedRequestError should reclassify.
  it('classifier overrides explicit context code', () => {
    const err = wrap(new UserRejectedRequestError(new Error('cancelled')));
    expect(SDKError.from(err, ERROR_CODE.TRANSACTION_ERROR).code).toBe(
      ERROR_CODE.USER_REJECTED,
    );
  });

  // No viem class → fall back to caller-supplied code.
  it('falls back to caller-supplied code when classifier returns undefined', () => {
    const err = new Error('plain failure');
    expect(SDKError.from(err, ERROR_CODE.READ_ERROR).code).toBe(
      ERROR_CODE.READ_ERROR,
    );
  });

  it('falls back to UNKNOWN_ERROR when nothing is supplied', () => {
    expect(SDKError.from(new Error('plain')).code).toBe(
      ERROR_CODE.UNKNOWN_ERROR,
    );
  });
});
