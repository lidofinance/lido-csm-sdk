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
    expect(decodeRevertData(error)).toEqual({
      name: 'FailedToSendEther',
      args: [],
    });
  });

  it('decodes error with args', () => {
    const data = encodeKnownError('AccessControlUnauthorizedAccount', [
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ]);
    const error = Object.assign(new BaseError('reverted'), { data });
    const result = decodeRevertData(error);
    expect(result?.name).toBe('AccessControlUnauthorizedAccount');
    expect(result?.args).toEqual([
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ]);
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
    expect(decodeRevertData(error)?.name).toBe('FailedToSendEther');
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
    expect(decodeRevertData(error)?.name).toBe('FailedToSendEther');
  });

  it('extracts hex from error message via regex', () => {
    const data = encodeKnownError('FailedToSendEther');
    const error = new BaseError(`execution reverted: custom error ${data}`);
    expect(decodeRevertData(error)?.name).toBe('FailedToSendEther');
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
  it('exposes structured decodedRevert', () => {
    const data = encodeKnownError('FailedToSendEther');
    const error = Object.assign(new BaseError('tx reverted'), { data });
    const sdkError = SDKError.from(error);
    expect(sdkError.decodedRevert).toEqual({
      name: 'FailedToSendEther',
      args: [],
    });
  });

  it('formats message from decoded revert', () => {
    const data = encodeKnownError('AccessControlUnauthorizedAccount', [
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ]);
    const error = Object.assign(new BaseError('tx reverted'), { data });
    const sdkError = SDKError.from(error);
    expect(sdkError.message).toContain('AccessControlUnauthorizedAccount');
    expect(sdkError.message).toContain(
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    );
  });

  it('leaves decodedRevert undefined when decoding fails', () => {
    const error = new Error('some other error');
    const sdkError = SDKError.from(error);
    expect(sdkError.decodedRevert).toBeUndefined();
    expect(sdkError.message).toBe('some other error');
  });

  it('preserves the full upstream error as cause', () => {
    const data = encodeKnownError('FailedToSendEther');
    const upstream = Object.assign(new BaseError('tx reverted'), { data });
    const sdkError = SDKError.from(upstream);
    expect(sdkError.cause).toBe(upstream);
  });

  it('returns the same SDKError when wrapping an SDKError', () => {
    const inner = SDKError.from(new Error('inner'));
    expect(SDKError.from(inner)).toBe(inner);
  });

  // Narrowing on `decodedRevert.name` types `args` per error — the consumer
  // DX win of moving from string formatting to structured access.
  it('narrows args by name (compile-time only)', () => {
    const data = encodeKnownError('AccessControlUnauthorizedAccount', [
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ]);
    const sdkError = SDKError.from(
      Object.assign(new BaseError('reverted'), { data }),
    );
    const revert = sdkError.decodedRevert;
    if (revert?.name !== 'AccessControlUnauthorizedAccount') {
      throw new Error('expected AccessControlUnauthorizedAccount');
    }
    const [account, role] = revert.args;
    expect(account).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(role).toMatch(/^0x[0-9a-fA-F]+$/);
  });
});
