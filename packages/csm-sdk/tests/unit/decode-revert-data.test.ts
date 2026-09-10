import { describe, it, expect } from 'vitest';
import {
  Abi,
  BaseError,
  decodeErrorResult,
  encodeErrorResult,
  Hex,
} from 'viem';
import { AccountingAbi } from '../../src/abi/Accounting';
import {
  buildCombinedErrorAbi,
  decodeRevertData,
} from '../../src/common/utils/decode-revert-data';
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

  // Regression: viem surfaces estimateGas custom-error reverts WITH args as a
  // single message where the abi-encoded args trail the selector after ": "
  // (no 0x prefix), e.g. "custom error 0xe2517d3f: 0000...". A decoder that
  // captured the selector alone failed decodeErrorResult for every error that
  // has inputs. Pin the rejoin so typed-tuple errors decode from this format.
  it('reconstructs selector + args from a "custom error SELECTOR: args" message', () => {
    const full = encodeKnownError('AccessControlUnauthorizedAccount', [
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ]);
    const selector = full.slice(0, 10); // 0x + 4-byte selector
    const argsHex = full.slice(10); // abi-encoded args, no 0x prefix
    const error = new BaseError(
      `Execution reverted with reason: custom error ${selector}: ${argsHex}.`,
    );
    const result = decodeRevertData(error);
    expect(result?.name).toBe('AccessControlUnauthorizedAccount');
    expect(result?.args).toEqual([
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    ]);
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

describe('buildCombinedErrorAbi (selector dedup)', () => {
  const errorAbi = (
    name: string,
    inputs: ReadonlyArray<{ name: string; type: string }>,
  ): Abi =>
    [
      {
        type: 'error',
        name,
        inputs,
      },
    ] as Abi;

  it('keeps both items when names collide but signatures differ', () => {
    const abiA = errorAbi('Collide', [{ name: 'a', type: 'uint256' }]);
    const abiB = errorAbi('Collide', [{ name: 'b', type: 'address' }]);

    const combined = buildCombinedErrorAbi([abiA, abiB]);
    const errorEntries = combined.filter((x) => x.type === 'error');
    expect(errorEntries).toHaveLength(2);

    // Both selectors are still decodable, picking up distinct argument tuples.
    const dataA = encodeErrorResult({
      abi: abiA,
      errorName: 'Collide',
      args: [123n],
    });
    const dataB = encodeErrorResult({
      abi: abiB,
      errorName: 'Collide',
      args: ['0x0000000000000000000000000000000000000001'],
    });
    expect(decodeErrorResult({ abi: combined, data: dataA }).args).toEqual([
      123n,
    ]);
    expect(decodeErrorResult({ abi: combined, data: dataB }).args).toEqual([
      '0x0000000000000000000000000000000000000001',
    ]);
  });

  it('silently dedupes identical signatures across multiple ABIs', () => {
    const abiA = errorAbi('Same', [{ name: 'a', type: 'uint256' }]);
    const abiB = errorAbi('Same', [{ name: 'b', type: 'uint256' }]); // same signature, different param names

    const combined = buildCombinedErrorAbi([abiA, abiB]);
    expect(combined.filter((x) => x.type === 'error')).toHaveLength(1);
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
