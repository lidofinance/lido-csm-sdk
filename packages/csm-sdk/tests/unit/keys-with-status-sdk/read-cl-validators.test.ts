import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Hex } from 'viem';
import { readClValidators } from '../../../src/keys-with-status-sdk/read-cl-validators';
import { CL_POST_MAX_IDS } from '../../../src/keys-with-status-sdk/consts';

const BASE = 'http://cl';

const makeValidator = (pubkey: string) => ({
  index: '42',
  balance: '32000000000',
  status: 'active_ongoing',
  validator: {
    pubkey,
    withdrawal_credentials: '0x00',
    effective_balance: '32000000000',
    slashed: false,
    activation_eligibility_epoch: '100',
    activation_epoch: '200',
    exit_epoch: '18446744073709551615',
    withdrawable_epoch: '18446744073709551615',
  },
});

/** Echoes back one validator per `id` present in the request. */
const okFor = (pubkeys: string[]) =>
  new Response(
    JSON.stringify({
      execution_optimistic: false,
      finalized: true,
      data: pubkeys.map(makeValidator),
    }),
    { status: 200 },
  );

const errorResponse = (status: number) => new Response('nope', { status });

/** 98-char pubkeys, matching production length so chunking is realistic. */
const makePubkeys = (count: number): Hex[] =>
  Array.from(
    { length: count },
    (_, i) => `0x${i.toString(16).padStart(96, '0')}` as Hex,
  );

const idsFromUrl = (url: string) =>
  decodeURIComponent(new URL(url).searchParams.get('id') ?? '').split(',');

describe('readClValidators', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty array without any request for no pubkeys', async () => {
    expect(await readClValidators({ baseUrl: BASE, pubkeys: [] })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('issues a single POST for a key count that would need many GET chunks', async () => {
    const pubkeys = makePubkeys(100);
    fetchMock.mockResolvedValueOnce(okFor(pubkeys));

    const result = await readClValidators({ baseUrl: BASE, pubkeys });

    expect(result).toHaveLength(100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${BASE}/eth/v1/beacon/states/head/validators`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ ids: pubkeys });
  });

  it('re-probes POST on every call rather than remembering the fallback', async () => {
    const pubkeys = makePubkeys(40);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return errorResponse(405);
      return okFor(idsFromUrl(url));
    });

    const first = await readClValidators({ baseUrl: BASE, pubkeys });
    expect(first).toHaveLength(40);

    const postCalls = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === 'POST',
    );
    expect(postCalls).toHaveLength(1);

    fetchMock.mockClear();
    const second = await readClValidators({ baseUrl: BASE, pubkeys });
    expect(second).toHaveLength(40);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(true);
  });

  it('falls back to GET when POST returns more validators than requested', async () => {
    const pubkeys = makePubkeys(4);
    // A proxy that accepts POST but ignores the body answers with everything.
    const everything = makePubkeys(50);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === 'POST' ? okFor(everything) : okFor(idsFromUrl(url)),
    );

    const result = await readClValidators({ baseUrl: BASE, pubkeys });

    expect(result).toHaveLength(4);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(true);
  });

  it('falls back to GET when POST returns unrequested validators of equal count', async () => {
    const pubkeys = makePubkeys(4);
    // Same count as requested, but none of these are the keys we asked for.
    const strangers = Array.from(
      { length: 4 },
      (_, i) => `0x${(i + 1000).toString(16).padStart(96, '0')}` as Hex,
    );
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
      init?.method === 'POST' ? okFor(strangers) : okFor(idsFromUrl(url)),
    );

    const result = await readClValidators({ baseUrl: BASE, pubkeys });

    expect(result.map(({ pubkey }) => pubkey)).toEqual(pubkeys);
  });

  it('rethrows a throttling POST failure without trying GET', async () => {
    const pubkeys = makePubkeys(4);
    fetchMock.mockResolvedValue(errorResponse(429));

    await expect(
      readClValidators({ baseUrl: BASE, pubkeys }),
    ).rejects.toThrow();
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.method === 'POST'),
    ).toBe(true);
  });

  it.each([403, 413, 400, 500])(
    'falls back to GET when POST is rejected with %i',
    async (status) => {
      const pubkeys = makePubkeys(4);
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
        init?.method === 'POST'
          ? errorResponse(status)
          : okFor(idsFromUrl(url)),
      );

      const result = await readClValidators({ baseUrl: BASE, pubkeys });

      expect(result).toHaveLength(4);
    },
  );

  it('caps GET fallback concurrency', async () => {
    const pubkeys = makePubkeys(100);
    let inFlight = 0;
    let peak = 0;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return errorResponse(405);
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      return okFor(idsFromUrl(url));
    });

    await readClValidators({ baseUrl: BASE, pubkeys, concurrency: 3 });
    expect(peak).toBe(3);
  });

  it('fails the whole call rather than returning a truncated result', async () => {
    const pubkeys = makePubkeys(100);
    let getCount = 0;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return errorResponse(405);
      getCount += 1;
      // Third chunk is permanently throttled.
      if (getCount >= 3) return errorResponse(429);
      return okFor(idsFromUrl(url));
    });

    await expect(
      readClValidators({ baseUrl: BASE, pubkeys, concurrency: 1 }),
    ).rejects.toThrow();
  });

  it('splits the POST body at the id cap', async () => {
    const pubkeys = makePubkeys(12_000);
    const postedIds: string[][] = [];
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
      const { ids } = JSON.parse(init!.body as string) as { ids: string[] };
      postedIds.push(ids);
      return okFor(ids);
    });

    const result = await readClValidators({ baseUrl: BASE, pubkeys });

    expect(postedIds).toHaveLength(3);
    postedIds.forEach((ids) =>
      expect(ids.length).toBeLessThanOrEqual(CL_POST_MAX_IDS),
    );
    const union = new Set(postedIds.flat());
    pubkeys.forEach((pubkey) => expect(union.has(pubkey)).toBe(true));
    expect(result).toHaveLength(12_000);
    expect(
      fetchMock.mock.calls.every(([, init]) => init?.method === 'POST'),
    ).toBe(true);
  });

  it('applies the ignored-filter guard per POST chunk', async () => {
    const pubkeys = makePubkeys(12_000);
    const firstChunk = pubkeys.slice(0, CL_POST_MAX_IDS);
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const { ids } = JSON.parse(init.body as string) as { ids: string[] };
        if (ids[0] === firstChunk[0]) return okFor(ids);
        // A later chunk: proxy ignores the filter, answers with another chunk's pubkeys.
        return okFor(firstChunk.slice(0, 4));
      }
      return okFor(idsFromUrl(url));
    });

    const result = await readClValidators({ baseUrl: BASE, pubkeys });

    expect(result.map(({ pubkey }) => pubkey)).toEqual(pubkeys);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method !== 'POST'),
    ).toBe(true);
  });
});
