import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ClRequestError,
  fetchClValidators,
  getRetryDelay,
} from '../../../src/keys-with-status-sdk/cl-fetch';

const VALIDATOR = {
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
};

const okResponse = () =>
  new Response(
    JSON.stringify({
      execution_optimistic: false,
      finalized: true,
      data: [VALIDATOR],
    }),
    { status: 200 },
  );

const errorResponse = (status: number, headers?: Record<string, string>) =>
  new Response('nope', { status, headers });

const noSleep = async () => {};

describe('getRetryDelay', () => {
  it('honors a numeric Retry-After header, in seconds', () => {
    expect(getRetryDelay(0, '2')).toBe(2000);
  });

  it('caps Retry-After at 5s', () => {
    expect(getRetryDelay(0, '600')).toBe(5000);
  });

  it('backs off exponentially without a header', () => {
    expect(getRetryDelay(0, null)).toBe(500);
    expect(getRetryDelay(1, null)).toBe(1500);
  });

  it('ignores a non-numeric Retry-After header', () => {
    expect(getRetryDelay(0, 'Wed, 21 Oct 2015 07:28:00 GMT')).toBe(500);
  });

  it('ignores an empty Retry-After header', () => {
    expect(getRetryDelay(0, '')).toBe(500);
  });

  it('ignores a whitespace-only Retry-After header', () => {
    expect(getRetryDelay(1, '   ')).toBe(1500);
  });
});

describe('fetchClValidators', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses a successful response', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const result = await fetchClValidators('http://cl/x', { sleep: noSleep });
    expect(result).toHaveLength(1);
    expect(result[0]!.pubkey).toBe('0xaabb');
    expect(result[0]!.validatorIndex).toBe('42');
  });

  it('passes RequestInit straight through to fetch', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const init = { method: 'POST', body: '{}' };
    await fetchClValidators('http://cl/x', { init, sleep: noSleep });
    expect(fetchMock).toHaveBeenCalledWith('http://cl/x', init);
  });

  it.each([400, 403, 404, 405, 413, 415, 500, 501])(
    'flags %i as a capability signal',
    async (status) => {
      fetchMock.mockResolvedValueOnce(errorResponse(status));
      const error = await fetchClValidators('http://cl/x', {
        sleep: noSleep,
      }).catch((e) => e);
      expect(error).toBeInstanceOf(ClRequestError);
      expect(error.isCapabilitySignal).toBe(true);
      expect(error.status).toBe(status);
    },
  );

  it('flags a thrown fetch (network drop or CORS preflight) as a capability signal', async () => {
    const cause = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValueOnce(cause);
    const error = await fetchClValidators('http://cl/x', {
      sleep: noSleep,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ClRequestError);
    expect(error.isCapabilitySignal).toBe(true);
    expect(error.status).toBeUndefined();
    expect(error.cause).toBe(cause);
  });

  it('treats 500 as a fallback signal but still does not retry it', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500));
    const error = await fetchClValidators('http://cl/x', {
      sleep: noSleep,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ClRequestError);
    expect(error.isCapabilitySignal).toBe(true);
    expect(error.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 429 and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(okResponse());
    const result = await fetchClValidators('http://cl/x', { sleep: noSleep });
    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a 503 and gives up after CL_RETRY_ATTEMPTS', async () => {
    fetchMock.mockResolvedValue(errorResponse(503));
    const error = await fetchClValidators('http://cl/x', {
      sleep: noSleep,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ClRequestError);
    expect(error.isCapabilitySignal).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('waits the Retry-After duration between attempts', async () => {
    const sleep = vi.fn(async () => {});
    fetchMock
      .mockResolvedValueOnce(errorResponse(429, { 'retry-after': '3' }))
      .mockResolvedValueOnce(okResponse());
    await fetchClValidators('http://cl/x', { sleep });
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it('wraps an unparseable body as a fallback signal', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"garbage":true}', { status: 200 }),
    );
    const error = await fetchClValidators('http://cl/x', {
      sleep: noSleep,
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ClRequestError);
    expect(error.isCapabilitySignal).toBe(true);
  });
});
