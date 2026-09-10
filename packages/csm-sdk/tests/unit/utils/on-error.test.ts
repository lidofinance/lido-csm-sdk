import { describe, it, expect } from 'vitest';
import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
} from 'viem';
import {
  onError,
  onVersionError,
  findRevertError,
  onRevertEmptyList,
} from '../../../src/common/utils/on-error';

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

describe('findRevertError', () => {
  it('returns the inner ContractFunctionRevertedError from a wrapping BaseError', () => {
    const inner = new ContractFunctionRevertedError({
      abi: [],
      functionName: 'foo',
    });
    const wrapper = new BaseError('wrapper', { cause: inner });

    expect(findRevertError(wrapper)).toBe(inner);
  });

  it('returns the error itself when it is already a ContractFunctionRevertedError', () => {
    const inner = new ContractFunctionRevertedError({
      abi: [],
      functionName: 'foo',
    });

    expect(findRevertError(inner)).toBe(inner);
  });

  it('returns undefined for a plain Error', () => {
    expect(findRevertError(new Error('plain'))).toBeUndefined();
  });

  it('returns undefined for a BaseError with no revert in the chain', () => {
    expect(findRevertError(new BaseError('no revert'))).toBeUndefined();
  });
});

describe('onRevertEmptyList', () => {
  it('returns [] on a wrapped revert', () => {
    expect(onRevertEmptyList(makeRevertedError())).toEqual([]);
  });

  it('rethrows a plain error', () => {
    expect(() => onRevertEmptyList(new Error('boom'))).toThrow('boom');
  });

  it('rethrows an unrelated BaseError', () => {
    expect(() => onRevertEmptyList(new BaseError('unrelated'))).toThrow(
      'unrelated',
    );
  });
});
