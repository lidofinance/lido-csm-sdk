import { describe, expect, it, vi } from 'vitest';
import type { Hex } from 'viem';
import { BusRegistry } from '../../../src/common/class-primitives/bus-registry';
import { DepositDataSDK } from '../../../src/deposit-data-sdk/deposit-data-sdk';

const PUBKEY = `0x${'ab'.repeat(48)}` as Hex;

const makeSdk = (getClKeys: (pubkeys: Hex[]) => Promise<unknown>) => {
  const bus = new BusRegistry();
  bus.register({ getClKeys } as unknown as never, 'keysWithStatus' as never);
  return new DepositDataSDK({ core: {} as never, bus });
};

describe('DepositDataSDK.checkClKeys — CL outage degrade', () => {
  it('resolves to [] instead of throwing when getClKeys rejects', async () => {
    const sdk = makeSdk(() => Promise.reject(new Error('CL down')));

    await expect(sdk.checkClKeys([PUBKEY])).resolves.toEqual([]);
  });

  it('still flags an existing CL validator when getClKeys succeeds', async () => {
    const sdk = makeSdk(() =>
      Promise.resolve([{ pubkey: PUBKEY, validatorIndex: '1' } as never]),
    );

    const errors = await sdk.checkClKeys([PUBKEY]);
    expect(errors).toHaveLength(1);
  });
});

// Guards that the degrade path is actually exercised, not just a mock that
// happens to resolve — otherwise the first test above would pass vacuously
// if `.catch()` were removed and `getClKeys` were never awaited.
describe('DepositDataSDK.checkClKeys — sanity', () => {
  it('awaits getClKeys', async () => {
    const getClKeys = vi.fn().mockResolvedValue(null);
    const sdk = makeSdk(getClKeys);

    await sdk.checkClKeys([PUBKEY]);

    expect(getClKeys).toHaveBeenCalledWith([PUBKEY]);
  });
});
