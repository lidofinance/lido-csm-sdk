import { describe, it, expect } from 'vitest';
import { BaseError, encodeErrorResult, Hex } from 'viem';
import { AccountingAbi } from '../../src/abi/Accounting';
import { decodeRevertData } from '../../src/common/utils/decode-revert-data';
import { SDKError } from '../../src/common/utils/sdk-error';

const encodeKnownError = (name: string, args?: unknown[]): Hex =>
  encodeErrorResult({
    abi: AccountingAbi,
    errorName: name,
    args,
  } as Parameters<typeof encodeErrorResult>[0]);

describe('decodeRevertData', () => {
  it('decodes error without args from BaseError.data', () => {
    const data = encodeKnownError('FailedToSendEther');
    const error = Object.assign(new BaseError('reverted'), { data });
    expect(decodeRevertData(error)).toBe('FailedToSendEther');
  });

  it('decodes error with args', () => {
    const data = encodeKnownError('AccessControlUnauthorizedAccount', [
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ]);
    const error = Object.assign(new BaseError('reverted'), { data });
    const result = decodeRevertData(error);
    expect(result).toContain('AccessControlUnauthorizedAccount');
    expect(result).toContain('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  });

  it('returns undefined for unknown selector', () => {
    const error = Object.assign(new BaseError('reverted'), {
      data: '0xdeadbeef' as Hex,
    });
    expect(decodeRevertData(error)).toBeUndefined();
  });

  it('extracts hex from details string (duck-typed, no instanceof)', () => {
    const data = encodeKnownError('FailedToSendEther');
    const error = {
      details: `execution reverted: custom error ${data}`,
      shortMessage: `Execution reverted with reason: custom error ${data}.`,
      cause: undefined,
    };
    expect(decodeRevertData(error)).toBe('FailedToSendEther');
  });

  it('extracts hex from nested cause chain', () => {
    const data = encodeKnownError('FailedToSendEther');
    const error = {
      message: 'outer error',
      cause: {
        details: `execution reverted: custom error ${data}`,
        name: 'ExecutionRevertedError',
      },
    };
    expect(decodeRevertData(error)).toBe('FailedToSendEther');
  });

  it('extracts hex from error message via regex', () => {
    const data = encodeKnownError('FailedToSendEther');
    const error = new BaseError(`execution reverted: custom error ${data}`);
    expect(decodeRevertData(error)).toBe('FailedToSendEther');
  });

  it('returns undefined for non-object errors', () => {
    expect(decodeRevertData('string')).toBeUndefined();
    expect(decodeRevertData(null)).toBeUndefined();
    expect(decodeRevertData(42)).toBeUndefined();
  });

  it('returns undefined for empty data', () => {
    const error = Object.assign(new BaseError('reverted'), { data: '0x' });
    expect(decodeRevertData(error)).toBeUndefined();
  });
});

describe('SDKError.from with revert decoding', () => {
  it('enriches message with decoded error', () => {
    const data = encodeKnownError('FailedToSendEther');
    const error = Object.assign(new BaseError('tx reverted'), { data });
    const sdkError = SDKError.from(error);
    expect(sdkError.errorMessage).toBe('FailedToSendEther');
  });

  it('preserves original message when decoding fails', () => {
    const error = new Error('some other error');
    const sdkError = SDKError.from(error);
    expect(sdkError.errorMessage).toBe('some other error');
  });
});
