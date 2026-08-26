import type { Hex } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KeysWithStatusSDK } from '../../../src/keys-with-status-sdk/keys-with-status-sdk';

const makeSdk = (keysApiLink?: string) =>
  new KeysWithStatusSDK({ core: { keysApiLink } } as any);

const pubkey = (fill: string) => `0x${fill.repeat(96)}` as Hex;

const okResponse = (key: Hex) =>
  new Response(JSON.stringify({ data: [{ key }] }), { status: 200 });

describe('KeysWithStatusSDK.getApiKeys', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when the keys API is not configured', async () => {
    expect(await makeSdk(undefined).getApiKeys([pubkey('1')])).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the keys API resolves to an empty string', async () => {
    expect(await makeSdk('').getApiKeys([pubkey('2')])).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an empty list for an empty pubkey list', async () => {
    expect(await makeSdk('http://keys').getApiKeys([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns keys on success', async () => {
    const key = pubkey('3');
    fetchMock.mockResolvedValueOnce(okResponse(key));
    expect(await makeSdk('http://keys').getApiKeys([key])).toEqual([{ key }]);
  });

  it('returns null when the request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await makeSdk('http://keys').getApiKeys([pubkey('4')])).toBeNull();
  });
});
