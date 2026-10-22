import { describe, expect, it, vi } from 'vitest';
import { keccak256, toHex } from 'viem';
import { ModuleSDK } from '../../../src/module-sdk/module-sdk';

const account = '0x0000000000000000000000000000000000000001';

describe('ModuleSDK.hasProtocolRole', () => {
  it.each([true, false])(
    'passes keccak role hash and returns %s',
    async (held) => {
      const hasRole = vi.fn().mockResolvedValue(held);
      const core = {
        cacheVersion: 'test',
        contractBaseModule: { read: { hasRole } },
      };
      const sdk = new ModuleSDK({ core: core as never });

      const result = await sdk.hasProtocolRole(
        'ENABLE_TOP_UP_ALLOCATION_ROLE',
        account,
      );

      expect(result).toBe(held);
      expect(hasRole).toHaveBeenCalledWith([
        keccak256(toHex('ENABLE_TOP_UP_ALLOCATION_ROLE')),
        account,
      ]);
    },
  );
});
