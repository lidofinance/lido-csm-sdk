import { describe, it, expect } from 'vitest';
import { KEY_STATUS } from '../../../src/common/constants/keys';
import {
  getKeysPerChunk,
  getChunks,
  getClUrls,
} from '../../../src/keys-with-status-sdk/cl-chunks';
import {
  parseClResponse,
  type ClKeyInput,
} from '../../../src/keys-with-status-sdk/parse-cl-response';

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

describe('parseClResponse', () => {
  const makeClKey = (overrides: Partial<ClKeyInput> = {}): ClKeyInput => ({
    index: '42',
    balance: '32000000000',
    status: 'active_ongoing',
    validator: {
      pubkey: '0xaabb',
      withdrawal_credentials: '0x00',
      effective_balance: '32000000000',
      slashed: false,
      activation_eligibility_epoch: '100',
      activation_epoch: '200',
      exit_epoch: '18446744073709551615',
      withdrawable_epoch: '18446744073709551615',
    },
    ...overrides,
  });

  const makeResponse = (data: ClKeyInput[] = [makeClKey()]) =>
    JSON.stringify({
      execution_optimistic: false,
      finalized: true,
      data,
    });

  it('parses valid response', () => {
    const result = parseClResponse(makeResponse());
    expect(result).toHaveLength(1);
    expect(result[0]!.pubkey).toBe('0xaabb');
  });

  it('parses empty data array', () => {
    const result = parseClResponse(makeResponse([]));
    expect(result).toEqual([]);
  });

  it('throws on missing fields', () => {
    expect(() => parseClResponse(JSON.stringify({ data: [] }))).toThrow();
  });

  it('throws on invalid status', () => {
    expect(() =>
      parseClResponse(
        makeResponse([makeClKey({ status: 'invalid_status' as any })]),
      ),
    ).toThrow();
  });

  it('throws on non-hex pubkey', () => {
    expect(() =>
      parseClResponse(
        makeResponse([
          makeClKey({
            validator: {
              ...makeClKey().validator,
              pubkey: 'not-hex' as any,
            },
          }),
        ]),
      ),
    ).toThrow();
  });

  it('throws on non-numeric index', () => {
    expect(() =>
      parseClResponse(makeResponse([makeClKey({ index: 'abc' as any })])),
    ).toThrow();
  });

  // Status mapping tests (previously prepareKey tests)
  it('maps active_ongoing to ACTIVE', () => {
    const result = parseClResponse(makeResponse([makeClKey()]));
    expect(result[0]!.status).toBe(KEY_STATUS.ACTIVE);
  });

  it('maps pending_initialized to DEPOSITABLE', () => {
    const result = parseClResponse(
      makeResponse([makeClKey({ status: 'pending_initialized' })]),
    );
    expect(result[0]!.status).toBe(KEY_STATUS.DEPOSITABLE);
  });

  it('maps pending_queued to ACTIVATION_PENDING', () => {
    const result = parseClResponse(
      makeResponse([makeClKey({ status: 'pending_queued' })]),
    );
    expect(result[0]!.status).toBe(KEY_STATUS.ACTIVATION_PENDING);
  });

  it('maps active_exiting to EXITING', () => {
    const result = parseClResponse(
      makeResponse([makeClKey({ status: 'active_exiting' })]),
    );
    expect(result[0]!.status).toBe(KEY_STATUS.EXITING);
  });

  it('maps active_slashed to EXITING', () => {
    const result = parseClResponse(
      makeResponse([makeClKey({ status: 'active_slashed' })]),
    );
    expect(result[0]!.status).toBe(KEY_STATUS.EXITING);
  });

  it('maps exited statuses to WITHDRAWAL_PENDING', () => {
    for (const status of [
      'exited_unslashed',
      'exited_slashed',
      'withdrawal_possible',
    ] as const) {
      const result = parseClResponse(makeResponse([makeClKey({ status })]));
      expect(result[0]!.status).toBe(KEY_STATUS.WITHDRAWAL_PENDING);
    }
  });

  it('maps withdrawal_done to WITHDRAWN', () => {
    const result = parseClResponse(
      makeResponse([makeClKey({ status: 'withdrawal_done' })]),
    );
    expect(result[0]!.status).toBe(KEY_STATUS.WITHDRAWN);
  });

  it('transforms validator fields correctly', () => {
    const result = parseClResponse(makeResponse());
    const key = result[0]!;
    expect(key.validatorIndex).toBe('42');
    expect(key.pubkey).toBe('0xaabb');
    expect(key.slashed).toBe(false);
    expect(key.activationEpoch).toBe(200n);
    expect(key.effectiveBalance).toBe(32_000_000_000_000_000_000n);
  });
});
