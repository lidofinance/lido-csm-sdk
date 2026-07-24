import { describe, it, expect } from 'vitest';
import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
} from 'viem';
import { onError, onVersionError } from '../../../src/common/utils/on-error';

const makeZeroDataError = () => {
  const inner = new ContractFunctionZeroDataError({ functionName: 'foo' });
  return new BaseError('wrapper', { cause: inner });
};

const makeRevertedError = () => {
  const inner = new ContractFunctionRevertedError({
    abi: [],
    functionName: 'foo',
  });
  return new BaseError('wrapper', { cause: inner });
};

describe('onError', () => {
  it('returns [null, null] for ContractFunctionZeroDataError', () => {
    expect(onError(makeZeroDataError())).toEqual([null, null]);
  });

  it('rethrows ContractFunctionRevertedError', () => {
    expect(() => onError(makeRevertedError())).toThrow();
  });

  it('rethrows non-BaseError', () => {
    expect(() => onError(new Error('plain error'))).toThrow('plain error');
  });

  it('rethrows BaseError without matching walk target', () => {
    const err = new BaseError('no match');
    expect(() => onError(err)).toThrow('no match');
  });
});

describe('onVersionError', () => {
  it('returns 0n for ContractFunctionZeroDataError', () => {
    expect(onVersionError(makeZeroDataError())).toBe(0n);
  });

  it('returns 0n for ContractFunctionRevertedError', () => {
    expect(onVersionError(makeRevertedError())).toBe(0n);
  });

  it('rethrows non-BaseError', () => {
    expect(() => onVersionError(new Error('boom'))).toThrow('boom');
  });

  it('rethrows BaseError without matching walk target', () => {
    const err = new BaseError('unrelated');
    expect(() => onVersionError(err)).toThrow('unrelated');
  });
});
