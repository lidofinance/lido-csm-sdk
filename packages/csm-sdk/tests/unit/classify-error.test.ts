import { describe, it, expect } from 'vitest';
import {
  BaseError,
  encodeErrorResult,
  ExecutionRevertedError,
  Hex,
  InsufficientFundsError,
  InternalRpcError,
  InvalidInputRpcError,
  UnknownBundleIdError,
  UserRejectedRequestError,
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

  it('INSUFFICIENT_FUNDS from InsufficientFundsError', () => {
    const err = wrap(new InsufficientFundsError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.INSUFFICIENT_FUNDS);
  });

  it('TRANSACTION_REVERTED from TransactionReceiptRevertedError', () => {
    const err = makeTxReceiptRevertedError();
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.TRANSACTION_REVERTED);
  });

  it('EXECUTION_REVERTED from ExecutionRevertedError (no decode)', () => {
    const err = wrap(new ExecutionRevertedError({}));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.EXECUTION_REVERTED);
  });

  it('WALLET_RPC_ERROR from InternalRpcError', () => {
    const err = wrap(new InternalRpcError(new Error('-32603')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.WALLET_RPC_ERROR);
  });

  it('WALLET_RPC_ERROR from InvalidInputRpcError', () => {
    const err = wrap(new InvalidInputRpcError(new Error('-32000')));
    expect(classifyError(err, undefined)).toBe(ERROR_CODE.WALLET_RPC_ERROR);
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
