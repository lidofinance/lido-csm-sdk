import { describe, expect, it } from 'vitest';
import { allowanceSlot } from '../../../src/allowance-sdk/allowance-override';

const owner = `0x${'11'.repeat(20)}` as const;
const spender = `0x${'22'.repeat(20)}` as const;

describe('allowanceSlot', () => {
  it('matches keccak(spender . keccak(owner . base)) for base slot 1', () => {
    expect(allowanceSlot({ owner, spender, baseSlot: 1n })).toBe(
      '0xc1c5f965d29f0d4614dc5d7a10929cd88a089f67386275dfd83b6bd3e280c8cd',
    );
  });

  it('differs per base slot', () => {
    expect(allowanceSlot({ owner, spender, baseSlot: 1n })).not.toBe(
      allowanceSlot({ owner, spender, baseSlot: 2n }),
    );
  });
});
