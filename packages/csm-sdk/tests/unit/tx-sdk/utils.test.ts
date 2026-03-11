import { describe, it, expect } from 'vitest';
import type { Hex } from 'viem';
import { encodeFunctionData, parseAbi } from 'viem';
import {
  TOKENS,
  STETH_ROUNDING_THRESHOLD,
} from '../../../src/common/constants/tokens.js';
import { prepCall } from '../../../src/tx-sdk/prep-call.js';
import { parseSpendingProps } from '../../../src/tx-sdk/parse-spending-props.js';
import { stripPermit } from '../../../src/tx-sdk/strip-permit.js';

const TEST_ABI = parseAbi([
  'function transfer(address to, uint256 amount)',
  'function deposit(uint256 id) payable',
]);

const TEST_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as const;

describe('prepCall', () => {
  const contract = { address: TEST_ADDRESS, abi: TEST_ABI };

  it('produces correct to and data for non-payable call', () => {
    const result = prepCall(contract, 'transfer', [TEST_ADDRESS, 100n]);
    expect(result.to).toBe(TEST_ADDRESS);
    expect(result.data).toBe(
      encodeFunctionData({
        abi: TEST_ABI,
        functionName: 'transfer',
        args: [TEST_ADDRESS, 100n],
      }),
    );
    expect(result.value).toBeUndefined();
  });

  it('includes value for payable call', () => {
    const result = prepCall(contract, 'deposit', [42n], 1000n);
    expect(result.to).toBe(TEST_ADDRESS);
    expect(result.value).toBe(1000n);
    expect(result.data).toBeDefined();
  });
});

describe('parseSpendingProps', () => {
  it('adds 10 wei buffer for stETH', () => {
    const props = { amount: 100n, token: TOKENS.steth as any };
    const result = parseSpendingProps(props);
    expect(result.amount).toBe(100n + STETH_ROUNDING_THRESHOLD);
  });

  it('does not add buffer for wstETH', () => {
    const props = { amount: 100n, token: TOKENS.wsteth as any };
    const result = parseSpendingProps(props);
    expect(result.amount).toBe(100n);
  });

  it('does not add buffer for zero stETH amount', () => {
    const props = { amount: 0n, token: TOKENS.steth as any };
    const result = parseSpendingProps(props);
    expect(result.amount).toBe(0n);
  });

  it('sets default deadline when not provided', () => {
    const props = { amount: 100n, token: TOKENS.wsteth as any };
    const before = BigInt(Math.floor(Date.now() / 1000));
    const result = parseSpendingProps(props);
    const after = BigInt(Math.floor(Date.now() / 1000));

    // deadline should be ~3600 seconds in the future
    expect(result.deadline).toBeGreaterThanOrEqual(before + 3600n);
    expect(result.deadline).toBeLessThanOrEqual(after + 3601n);
  });

  it('preserves explicit deadline', () => {
    const props = {
      amount: 100n,
      token: TOKENS.wsteth as any,
      deadline: 9999n,
    };
    const result = parseSpendingProps(props);
    expect(result.deadline).toBe(9999n);
  });
});

describe('stripPermit', () => {
  it('extracts only permit fields', () => {
    const full = {
      v: 27,
      r: '0xaabb' as Hex,
      s: '0xccdd' as Hex,
      value: 100n,
      deadline: 9999n,
      extraField: 'should be stripped',
    };
    const result = stripPermit(full as any);
    expect(result).toEqual({
      v: 27,
      r: '0xaabb',
      s: '0xccdd',
      value: 100n,
      deadline: 9999n,
    });
    expect(result).not.toHaveProperty('extraField');
  });
});
