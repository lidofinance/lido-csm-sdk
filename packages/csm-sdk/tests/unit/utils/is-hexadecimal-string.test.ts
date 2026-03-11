import { describe, it, expect } from 'vitest';
import {
  isHexadecimalString,
  trimHexPrefix,
  toHexString,
  normalizeTrimHex,
} from '../../../src/common/utils/is-hexadecimal-string.js';

describe('isHexadecimalString', () => {
  it('returns true for valid hex without prefix', () => {
    expect(isHexadecimalString('abcdef0123')).toBe(true);
  });

  it('returns true for valid hex with 0x prefix', () => {
    expect(isHexadecimalString('0xabcdef')).toBe(true);
  });

  it('returns false for non-hex characters', () => {
    expect(isHexadecimalString('0xGHIJ')).toBe(false);
    expect(isHexadecimalString('xyz')).toBe(false);
  });

  it('returns false for empty string after trimming prefix', () => {
    expect(isHexadecimalString('0x')).toBe(false);
    expect(isHexadecimalString('')).toBe(false);
  });

  it('validates exact length when specified', () => {
    expect(isHexadecimalString('aabb', 4)).toBe(true);
    expect(isHexadecimalString('aabb', 3)).toBe(false);
    expect(isHexadecimalString('0xaabb', 4)).toBe(true);
  });

  it('handles uppercase hex', () => {
    expect(isHexadecimalString('AABBCC')).toBe(true);
  });
});

describe('trimHexPrefix', () => {
  it('removes 0x prefix', () => {
    expect(trimHexPrefix('0xabcd')).toBe('abcd');
  });

  it('returns unchanged if no prefix', () => {
    expect(trimHexPrefix('abcd')).toBe('abcd');
  });
});

describe('toHexString', () => {
  it('adds 0x prefix when missing', () => {
    expect(toHexString('abcd')).toBe('0xabcd');
  });

  it('does not double-prefix', () => {
    expect(toHexString('0xabcd')).toBe('0xabcd');
  });
});

describe('normalizeTrimHex', () => {
  it('trims prefix and lowercases', () => {
    expect(normalizeTrimHex('0xAABBCC')).toBe('aabbcc');
  });

  it('lowercases without prefix', () => {
    expect(normalizeTrimHex('AABBCC')).toBe('aabbcc');
  });
});
