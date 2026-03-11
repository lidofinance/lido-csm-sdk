import { describe, it, expect } from 'vitest';
import {
  parseDepositData,
  removeKey,
} from '../../../src/deposit-data-sdk/parser.js';

const VALID_ITEM = {
  pubkey: 'aabbccdd',
  withdrawal_credentials: 'ee00',
  amount: 32_000_000_000,
  signature: 'ff1122',
  deposit_message_root: 'abcd',
  deposit_data_root: 'ef01',
  fork_version: '00000000',
  deposit_cli_version: '2.3.0',
  network_name: 'mainnet',
};

const makeJson = (items: unknown[]) => JSON.stringify(items);

describe('parseDepositData', () => {
  it('parses valid JSON array', () => {
    const result = parseDepositData(makeJson([VALID_ITEM]));
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('wraps single object into array', () => {
    const result = parseDepositData(JSON.stringify(VALID_ITEM));
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('normalizes 0x prefixes in hex fields', () => {
    const item = { ...VALID_ITEM, pubkey: '0xaabbccdd' };
    const result = parseDepositData(makeJson([item]));
    expect(result.success).toBe(true);
    // After normalization, should have 0x prefix (toHexString adds it)
    expect(result.data?.[0]?.pubkey).toMatch(/^0x/);
  });

  it('returns error for empty string', () => {
    const result = parseDepositData('');
    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('returns error for whitespace-only', () => {
    const result = parseDepositData('   ');
    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('returns error for invalid JSON', () => {
    const result = parseDepositData('{invalid');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('returns error for empty array', () => {
    const result = parseDepositData('[]');
    expect(result.success).toBe(false);
    expect(result.error).toContain('at least 1');
  });

  it('returns error for item missing multiple required fields', () => {
    const result = parseDepositData(makeJson([{ some_field: 'value' }]));
    expect(result.success).toBe(false);
    expect(result.error).toContain('missing required field');
  });

  it('returns error for non-object item', () => {
    const result = parseDepositData(makeJson(['not-an-object']));
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for oversized data', () => {
    const huge = 'x'.repeat(1_048_576 + 1);
    const result = parseDepositData(huge);
    expect(result.success).toBe(false);
    expect(result.error).toContain('too big');
  });
});

describe('removeKey', () => {
  const json = makeJson([VALID_ITEM, { ...VALID_ITEM, pubkey: '112233' }]);

  it('removes key at valid index', () => {
    const result = removeKey(json, 0);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.json).toBeDefined();
  });

  it('returns error for negative index', () => {
    const result = removeKey(json, -1);
    expect(result.success).toBe(false);
    expect(result.error).toContain('non-negative');
  });

  it('returns error for out-of-bounds index', () => {
    const result = removeKey(json, 999);
    expect(result.success).toBe(false);
    expect(result.error).toContain('out of bounds');
  });

  it('returns error for non-integer index', () => {
    const result = removeKey(json, 1.5);
    expect(result.success).toBe(false);
    expect(result.error).toContain('non-negative integer');
  });

  it('returns empty string when removing last item', () => {
    const singleJson = makeJson([VALID_ITEM]);
    const result = removeKey(singleJson, 0);
    expect(result.success).toBe(true);
    expect(result.json).toBe('');
    expect(result.data).toHaveLength(0);
  });

  it('returns error for invalid JSON input', () => {
    const result = removeKey('{bad', 0);
    expect(result.success).toBe(false);
  });
});
