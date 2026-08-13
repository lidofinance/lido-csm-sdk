import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Hex } from 'viem';
import { KeysWithStatusSDK } from '../../../src/keys-with-status-sdk/keys-with-status-sdk';

const makeSdk = (clApiUrl?: string) =>
  new KeysWithStatusSDK({ core: { clApiUrl } } as any);

const PUBKEY = `0x${'0'.repeat(96)}` as Hex;

const okResponse = () =>
  new Response(
    JSON.stringify({
      execution_optimistic: false,
      finalized: true,
      data: [
        {
          index: '42',
          balance: '32000000000',
          status: 'active_ongoing',
          validator: {
            pubkey: PUBKEY,
            withdrawal_credentials: '0x00',
            effective_balance: '32000000000',
            slashed: false,
            activation_eligibility_epoch: '100',
            activation_epoch: '200',
            exit_epoch: '18446744073709551615',
            withdrawable_epoch: '18446744073709551615',
          },
        },
      ],
    }),
    { status: 200 },
  );

describe('KeysWithStatusSDK.getClKeys', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when clApiUrl is not configured', async () => {
    expect(await makeSdk(undefined).getClKeys([PUBKEY])).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null for an empty pubkey list', async () => {
    expect(await makeSdk('http://cl').getClKeys([])).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns parsed keys on success', async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const result = await makeSdk('http://cl').getClKeys([PUBKEY]);
    expect(result).toHaveLength(1);
    expect(result![0]!.pubkey).toBe(PUBKEY);
  });

  it('throws instead of returning partial data when the CL fails', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(makeSdk('http://cl').getClKeys([PUBKEY])).rejects.toThrow();
  });

  it('re-probes POST on every call rather than remembering the fallback', async () => {
    const sdk = makeSdk('http://cl');
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? new Response('nope', { status: 405 })
        : okResponse(),
    );

    await sdk.getClKeys([PUBKEY]);
    fetchMock.mockClear();
    // Different pubkeys avoid the @Cache decorator's memoized result.
    await sdk.getClKeys([`0x${'1'.repeat(96)}` as Hex]);

    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(true);
  });
});
