import { describe, it, expect, vi } from 'vitest';
import {
  fetchWithFallback,
  fetchOneOf,
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
});
