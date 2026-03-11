import { describe, it, expect } from 'vitest';
import type { Hex } from 'viem';
import { KEY_STATUS } from '../../../src/common/constants/keys.js';
import {
  getKeysPerChunk,
  getChunks,
  getClUrls,
  prepareKey,
} from '../../../src/keys-with-status-sdk/cl-chunks.js';
import type { ClKey } from '../../../src/keys-with-status-sdk/types.js';

describe('getKeysPerChunk', () => {
  it('calculates keys that fit in URL length', () => {
    // MAX_URL_LENGTH = 2048 - 66 = 1982
    // maxKeysQueryLength = 1982 - url.length - 4
    // keysPerChunk = floor((maxKeysQueryLength + 3) / (keyLength + 3))
    const url = 'http://localhost:5052/eth/v1/beacon/states/head/validators';
    const keyLength = 98; // 0x + 96 hex chars
    const result = getKeysPerChunk(url, keyLength);
    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

  it('returns more keys for shorter URLs', () => {
    const short = getKeysPerChunk('http://a', 10);
    const long = getKeysPerChunk('http://a' + '/path'.repeat(50), 10);
    expect(short).toBeGreaterThan(long);
  });

  it('returns fewer keys for longer key lengths', () => {
    const shortKeys = getKeysPerChunk('http://a', 10);
    const longKeys = getKeysPerChunk('http://a', 100);
    expect(shortKeys).toBeGreaterThan(longKeys);
  });
});

describe('getChunks', () => {
  it('splits array into chunks of max size', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const result = getChunks(arr, 2);
    expect(result).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('returns single chunk when array fits', () => {
    const result = getChunks(['a', 'b'], 5);
    expect(result).toEqual([['a', 'b']]);
  });

  it('handles empty array', () => {
    expect(getChunks([], 5)).toEqual([]);
  });

  it('handles undefined input', () => {
    expect(getChunks(undefined, 5)).toEqual([]);
  });
});

describe('getClUrls', () => {
  it('creates URLs with encoded comma separators', () => {
    const keys = ['0xaabb', '0xccdd'];
    const urls = getClUrls(keys, 'http://localhost:5052');
    expect(urls.length).toBe(1);
    expect(urls[0]).toContain('/eth/v1/beacon/states/head/validators?id=');
    expect(urls[0]).toContain('0xaabb');
    expect(urls[0]).toContain(encodeURIComponent(','));
    expect(urls[0]).toContain('0xccdd');
  });

  it('handles empty keys', () => {
    expect(getClUrls([], 'http://localhost:5052')).toEqual([]);
  });

  it('handles undefined keys', () => {
    expect(getClUrls(undefined, 'http://localhost:5052')).toEqual([]);
  });
});

describe('prepareKey', () => {
  const makeClKey = (overrides: Partial<ClKey> = {}): ClKey => ({
    index: '42',
    balance: '32000000000',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xaabb' as Hex,
      withdrawal_credentials: '0x00' as Hex,
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '100',
      activation_epoch: '200',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
    ...overrides,
  });

  it('maps active_ongoing to ACTIVE', () => {
    const result = prepareKey(makeClKey({ status: 'active_ongoing' }));
    expect(result.status).toBe(KEY_STATUS.ACTIVE);
  });

  it('maps pending_initialized to DEPOSITABLE', () => {
    const result = prepareKey(makeClKey({ status: 'pending_initialized' }));
    expect(result.status).toBe(KEY_STATUS.DEPOSITABLE);
  });

  it('maps pending_queued to ACTIVATION_PENDING', () => {
    const result = prepareKey(makeClKey({ status: 'pending_queued' }));
    expect(result.status).toBe(KEY_STATUS.ACTIVATION_PENDING);
  });

  it('maps active_exiting to EXITING', () => {
    const result = prepareKey(makeClKey({ status: 'active_exiting' }));
    expect(result.status).toBe(KEY_STATUS.EXITING);
  });

  it('maps active_slashed to EXITING', () => {
    const result = prepareKey(makeClKey({ status: 'active_slashed' }));
    expect(result.status).toBe(KEY_STATUS.EXITING);
  });

  it('maps exited statuses to WITHDRAWAL_PENDING', () => {
    expect(prepareKey(makeClKey({ status: 'exited_unslashed' })).status).toBe(
      KEY_STATUS.WITHDRAWAL_PENDING,
    );
    expect(prepareKey(makeClKey({ status: 'exited_slashed' })).status).toBe(
      KEY_STATUS.WITHDRAWAL_PENDING,
    );
    expect(
      prepareKey(makeClKey({ status: 'withdrawal_possible' })).status,
    ).toBe(KEY_STATUS.WITHDRAWAL_PENDING);
  });

  it('maps withdrawal_done to WITHDRAWN', () => {
    const result = prepareKey(makeClKey({ status: 'withdrawal_done' }));
    expect(result.status).toBe(KEY_STATUS.WITHDRAWN);
  });

  it('extracts validator fields correctly', () => {
    const result = prepareKey(makeClKey());
    expect(result.validatorIndex).toBe('42');
    expect(result.pubkey).toBe('0xaabb');
    expect(result.slashed).toBe(false);
    expect(result.activationEpoch).toBe(200n);
    expect(result.effectiveBalance).toBe(32_000_000_000n);
  });
});
