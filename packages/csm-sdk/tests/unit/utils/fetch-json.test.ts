import { describe, it, expect, vi } from 'vitest';
import {
  fetchWithFallback,
  fetchOneOf,
  HttpStatusError,
} from '../../../src/common/utils/fetch-json';

describe('fetchWithFallback', () => {
  it('returns result from first successful fetch', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockResolvedValue('data');

    const result = await fetchWithFallback(['url1', 'url2'], fetchFn);

    expect(result).toBe('data');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('url1');
  });

  it('skips null URLs', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockResolvedValue('data');

    const result = await fetchWithFallback([null, 'url1'], fetchFn);

    expect(result).toBe('data');
    expect(fetchFn).toHaveBeenCalledWith('url1');
  });

  it('falls back on fetch returning null', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('fallback');

    const result = await fetchWithFallback(['url1', 'url2'], fetchFn);

    expect(result).toBe('fallback');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('falls back on fetch throwing', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    const result = await fetchWithFallback(['url1', 'url2'], fetchFn);

    expect(result).toBe('ok');
  });

  it('returns undefined when all fail', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockRejectedValue(new Error('fail'));

    const result = await fetchWithFallback(['url1'], fetchFn);

    expect(result).toBeUndefined();
  });

  it('retries only the throttled url in the next round', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockRejectedValueOnce(new HttpStatusError(429, null))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('ok');

    const result = await fetchWithFallback(['url1', 'url2'], fetchFn, {
      sleep: async () => {},
    });

    expect(result).toBe('ok');
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn).toHaveBeenNthCalledWith(1, 'url1');
    expect(fetchFn).toHaveBeenNthCalledWith(2, 'url2');
    expect(fetchFn).toHaveBeenNthCalledWith(3, 'url1');
  });

  it('sleeps with the Retry-After-derived delay before the next round', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockRejectedValueOnce(new HttpStatusError(429, '3'))
      .mockResolvedValueOnce('ok');
    const sleep = vi.fn(async () => {});

    await fetchWithFallback(['url1'], fetchFn, { sleep });

    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it('does not retry a non-retryable status', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockRejectedValueOnce(new HttpStatusError(404, null))
      .mockResolvedValueOnce('ok');
    const sleep = vi.fn(async () => {});

    const result = await fetchWithFallback(['url1'], fetchFn, { sleep });

    expect(result).toBeUndefined();
    expect(sleep).not.toHaveBeenCalled();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('gives up after the retry budget and returns undefined', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockRejectedValue(new HttpStatusError(503, null));
    const sleep = vi.fn(async () => {});

    const result = await fetchWithFallback(['url1'], fetchFn, {
      retries: 2,
      sleep,
    });

    expect(result).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});

describe('fetchOneOf', () => {
  it('returns data from custom fetch function', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockResolvedValue('result');

    const result = await fetchOneOf({ urls: ['url1'], fetch: fetchFn });

    expect(result).toBe('result');
  });

  it('skips data that fails validation', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockResolvedValueOnce('bad')
      .mockResolvedValueOnce('good');
    const validate = vi.fn((data: string) => data === 'good');

    const result = await fetchOneOf({
      urls: ['url1', 'url2'],
      fetch: fetchFn,
      validate,
    });

    expect(result).toBe('good');
    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when no URL succeeds', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<string | null>>()
      .mockResolvedValue(null);

    const result = await fetchOneOf({ urls: ['url1'], fetch: fetchFn });

    expect(result).toBeUndefined();
  });

  // real fetch rejects once its signal aborts; the stub must do the same to
  // exercise the timeout path instead of hanging forever
  const hangUntilAborted = (init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(init.signal!.reason),
      );
    });

  it('times out a hanging default fetch and falls back to the next url', async () => {
    const fetchSpy = vi.fn((url: string, init?: RequestInit) => {
      if (url === 'url1') return hangUntilAborted(init);
      return Promise.resolve(new Response(JSON.stringify({ ok: true })));
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await fetchOneOf({
      urls: ['url1', 'url2'],
      parse: JSON.parse,
      timeout: 20,
    });

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it('does not retry a timed-out url in a later round', async () => {
    const fetchSpy = vi.fn((_url: string, init?: RequestInit) =>
      hangUntilAborted(init),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const result = await fetchOneOf({
      urls: ['url1'],
      parse: JSON.parse,
      timeout: 20,
    });

    expect(result).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
