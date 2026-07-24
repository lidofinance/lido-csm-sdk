import { describe, it, expect } from 'vitest';
import type { Hex } from 'viem';
import { zeroAddress } from 'viem';
import { clearEmptyAddress } from '../../../src/common/utils/clear-empty-address';
import { compareLowercase } from '../../../src/common/utils/compare-lowercase';
import { isBigint } from '../../../src/common/utils/is-bigint';
import { isValidIpfsCid } from '../../../src/common/utils/is-valid-ipfs-cid';
import { parseValue } from '../../../src/common/utils/parse-value';
import {
  sortByBlockNumber,
  sortRewardsByRefSlot,
} from '../../../src/common/utils/sort';
import { parseClaimProps } from '../../../src/common/utils/parse-claim-props';
import { parseDepositData } from '../../../src/common/utils/parse-deposit-data';

describe('clearEmptyAddress', () => {
  it('returns undefined for zeroAddress', () => {
    expect(clearEmptyAddress(zeroAddress)).toBeUndefined();
  });

  it('returns the address for non-zero', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    expect(clearEmptyAddress(addr)).toBe(addr);
  });

  it('returns undefined when called without argument', () => {
    expect(clearEmptyAddress()).toBeUndefined();
  });
});

describe('compareLowercase', () => {
  it('matches case-insensitively', () => {
    expect(compareLowercase('Hello', 'hello')).toBe(true);
    expect(compareLowercase('ABC', 'abc')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(compareLowercase('abc', 'xyz')).toBe(false);
  });

  it('returns false when first value is undefined', () => {
    expect(compareLowercase(undefined, 'abc')).toBe(false);
  });

  it('returns false when second value is undefined', () => {
    expect(compareLowercase('abc', undefined)).toBe(false);
  });
});

describe('isBigint', () => {
  it('returns true for bigint', () => {
    expect(isBigint(0n)).toBe(true);
    expect(isBigint(123n)).toBe(true);
  });

  it('returns false for number', () => {
    expect(isBigint(42)).toBe(false);
  });

  it('returns false for string', () => {
    expect(isBigint('123')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isBigint(null)).toBe(false);
    expect(isBigint(undefined)).toBe(false);
  });
});

describe('isValidIpfsCid', () => {
  it('accepts CIDv0 (Qm prefix)', () => {
    expect(isValidIpfsCid('Qm' + 'a'.repeat(44))).toBe(true);
  });

  it('accepts CIDv1 (baf prefix)', () => {
    expect(isValidIpfsCid('baf' + 'a'.repeat(50))).toBe(true);
  });

  it('rejects too short strings', () => {
    expect(isValidIpfsCid('Qm' + 'a'.repeat(10))).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidIpfsCid('')).toBe(false);
  });

  it('rejects strings without valid prefix', () => {
    expect(isValidIpfsCid('x'.repeat(50))).toBe(false);
  });
});

describe('parseValue', () => {
  it('returns bigint as-is', () => {
    expect(parseValue(100n)).toBe(100n);
  });

  it('parses string via parseEther', () => {
    // parseEther('1', 'wei') treats the string as ether amount
    expect(parseValue('1')).toBe(1_000_000_000_000_000_000n);
    expect(parseValue('0.5')).toBe(500_000_000_000_000_000n);
  });
});

describe('sortByBlockNumber', () => {
  it('sorts ascending by blockNumber', () => {
    const items = [
      { blockNumber: 3n },
      { blockNumber: 1n },
      { blockNumber: 2n },
    ];
    items.sort(sortByBlockNumber);
    expect(items.map((i) => i.blockNumber)).toEqual([1n, 2n, 3n]);
  });
});

describe('sortRewardsByRefSlot', () => {
  it('sorts descending by refSlot', () => {
    const items = [{ refSlot: 1n }, { refSlot: 3n }, { refSlot: 2n }];
    items.sort(sortRewardsByRefSlot);
    expect(items.map((i) => i.refSlot)).toEqual([3n, 2n, 1n]);
  });
});

describe('parseClaimProps', () => {
  it('fills default proof and shares', () => {
    const result = parseClaimProps({ account: '0x123' as `0x${string}` });
    expect(result.proof).toEqual([]);
    expect(result.shares).toBe(0n);
    expect(result.account).toBe('0x123');
  });

  it('preserves provided proof and shares', () => {
    const proof = ['0xabc' as `0x${string}`];
    const result = parseClaimProps({
      account: '0x1' as `0x${string}`,
      proof,
      shares: 5n,
    });
    expect(result.proof).toBe(proof);
    expect(result.shares).toBe(5n);
  });
});

describe('parseDepositData', () => {
  it('concatenates keys and signatures into hex strings', () => {
    const keys = [
      { pubkey: '0xaabb' as Hex, signature: '0xccdd' as Hex },
      { pubkey: '0x1122' as Hex, signature: '0x3344' as Hex },
    ];
    const result = parseDepositData(keys);
    expect(result.keysCount).toBe(2n);
    expect(result.publicKeys).toBe('0xaabb1122');
    expect(result.signatures).toBe('0xccdd3344');
  });

  it('handles keys without 0x prefix', () => {
    const keys = [{ pubkey: 'aabb' as Hex, signature: 'ccdd' as Hex }];
    const result = parseDepositData(keys);
    expect(result.keysCount).toBe(1n);
    expect(result.publicKeys).toBe('0xaabb');
    expect(result.signatures).toBe('0xccdd');
  });
});
