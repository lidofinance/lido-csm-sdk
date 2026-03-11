import { describe, it, expect } from 'vitest';
import type { Hex } from 'viem';
import { splitKeys } from '../../../src/common/utils/split-keys.js';
import { PUBKEY_LENGTH_BYTES } from '../../../src/common/constants/keys.js';

describe('splitKeys', () => {
  const pubkey48 = ('0x' + 'aa'.repeat(PUBKEY_LENGTH_BYTES)) as Hex;
  const twoPubkeys = ('0x' +
    'aa'.repeat(PUBKEY_LENGTH_BYTES) +
    'bb'.repeat(PUBKEY_LENGTH_BYTES)) as Hex;

  it('splits concatenated hex into pubkey-sized chunks', () => {
    const result = splitKeys(twoPubkeys);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('0x' + 'aa'.repeat(PUBKEY_LENGTH_BYTES));
    expect(result[1]).toBe('0x' + 'bb'.repeat(PUBKEY_LENGTH_BYTES));
  });

  it('returns single key for single pubkey', () => {
    const result = splitKeys(pubkey48);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(pubkey48);
  });

  it('respects custom byte length', () => {
    const data = ('0x' + 'aa'.repeat(4) + 'bb'.repeat(4)) as Hex;
    const result = splitKeys(data, undefined, 4);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('0x' + 'aa'.repeat(4));
    expect(result[1]).toBe('0x' + 'bb'.repeat(4));
  });

  it('uses explicit count parameter', () => {
    const result = splitKeys(twoPubkeys, 1);
    expect(result).toHaveLength(1);
  });

  it('throws for non-hex input', () => {
    expect(() => splitKeys('not-hex' as `0x${string}`)).toThrow(
      'is not a hex-like string',
    );
  });
});
