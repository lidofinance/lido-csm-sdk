import { describe, it, expect } from 'vitest';
import {
  isDefined,
  isUnique,
  isNotUnique,
  isPropsDefined,
} from '../../../src/common/utils/is-defined';

describe('isDefined', () => {
  it('returns false for undefined', () => {
    expect(isDefined(undefined)).toBe(false);
  });

  it('returns true for null', () => {
    expect(isDefined(null)).toBe(true);
  });

  it('returns true for falsy values (0, "", false)', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(false)).toBe(true);
  });

  it('returns true for truthy values', () => {
    expect(isDefined(42)).toBe(true);
    expect(isDefined('hello')).toBe(true);
    expect(isDefined({})).toBe(true);
  });
});

describe('isUnique', () => {
  it('filters array to unique values', () => {
    const arr = [1, 2, 2, 3, 1, 3];
    expect(arr.filter(isUnique)).toEqual([1, 2, 3]);
  });

  it('preserves order of first occurrence', () => {
    const arr = ['b', 'a', 'b', 'c', 'a'];
    expect(arr.filter(isUnique)).toEqual(['b', 'a', 'c']);
  });

  it('returns empty for empty array', () => {
    expect([].filter(isUnique)).toEqual([]);
  });
});

describe('isNotUnique', () => {
  it('filters to duplicate entries', () => {
    const arr = [1, 2, 2, 3, 1, 3];
    expect(arr.filter(isNotUnique)).toEqual([2, 1, 3]);
  });

  it('returns empty when all unique', () => {
    expect([1, 2, 3].filter(isNotUnique)).toEqual([]);
  });
});

describe('isPropsDefined', () => {
  it('returns true when all specified props are defined', () => {
    const check = isPropsDefined<{ a?: number; b?: string }, 'a' | 'b'>(
      'a',
      'b',
    );
    expect(check({ a: 1, b: 'x' })).toBe(true);
  });

  it('returns false when a specified prop is undefined', () => {
    const check = isPropsDefined<{ a?: number; b?: string }, 'a' | 'b'>(
      'a',
      'b',
    );
    expect(check({ a: 1, b: undefined })).toBe(false);
  });

  it('returns false when a specified prop is null', () => {
    const check = isPropsDefined<{ a?: number | null }, 'a'>('a');
    expect(check({ a: null })).toBe(false);
  });

  it('returns true with no props to check', () => {
    const check = isPropsDefined<{ a?: number }, never>();
    expect(check({ a: undefined })).toBe(true);
  });
});
