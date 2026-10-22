import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODE, SDKError } from '../../../src/common/index';
import { BusRegistry } from '../../../src/common/class-primitives/bus-registry';
import { MetaRegistrySDK } from '../../../src/meta-registry-sdk/meta-registry-sdk';

const ENCODED = '0xdeadbeef';
const account = '0x0000000000000000000000000000000000000001';

const setup = (version: bigint) => {
  const read = { isTopUpAllocationEnabled: vi.fn().mockResolvedValue(false) };
  const encode = {
    enableTopUpAllocation: vi.fn().mockReturnValue(ENCODED),
    disableTopUpAllocation: vi.fn().mockReturnValue(ENCODED),
  };
  const perform = vi.fn().mockResolvedValue({ hash: '0x1' });
  const core = {
    cacheVersion: 'test',
    getContract: vi.fn().mockReturnValue({ read, encode }),
  };
  const bus = new BusRegistry();
  bus.register({ perform } as never, 'tx' as never);
  bus.register(
    { getModuleVersion: vi.fn().mockResolvedValue(version) } as never,
    'module' as never,
  );
  const sdk = new MetaRegistrySDK({ core: core as never, bus });
  return { sdk, read, encode, perform };
};

describe('MetaRegistrySDK top-up allocation', () => {
  describe('v1', () => {
    let ctx: ReturnType<typeof setup>;
    beforeEach(() => {
      ctx = setup(1n);
    });

    it('getter returns true without contract read', async () => {
      expect(await ctx.sdk.isTopUpAllocationEnabled(1n)).toBe(true);
      expect(ctx.read.isTopUpAllocationEnabled).not.toHaveBeenCalled();
    });

    it.each(['enableTopUpAllocation', 'disableTopUpAllocation'] as const)(
      '%s rejects with NOT_SUPPORTED',
      async (method) => {
        const err = await ctx.sdk[method]({
          account,
          nodeOperatorId: 1n,
        }).catch((e: unknown) => e);
        expect(err).toBeInstanceOf(SDKError);
        expect((err as SDKError).code).toBe(ERROR_CODE.NOT_SUPPORTED);
        expect(ctx.perform).not.toHaveBeenCalled();
      },
    );
  });

  describe('v2', () => {
    let ctx: ReturnType<typeof setup>;
    beforeEach(() => {
      ctx = setup(2n);
    });

    it('getter returns contract value', async () => {
      expect(await ctx.sdk.isTopUpAllocationEnabled(7n)).toBe(false);
      expect(ctx.read.isTopUpAllocationEnabled).toHaveBeenCalledWith([7n]);
    });

    it.each(['enableTopUpAllocation', 'disableTopUpAllocation'] as const)(
      '%s performs encoded call',
      async (method) => {
        await ctx.sdk[method]({ account, nodeOperatorId: 7n });
        expect(ctx.perform).toHaveBeenCalledTimes(1);
        const arg = ctx.perform.mock.calls[0]![0];
        expect(arg.account).toBe(account);
        expect(arg.call()).toBe(ENCODED);
        expect(ctx.encode[method]).toHaveBeenCalledWith([7n]);
      },
    );
  });
});
