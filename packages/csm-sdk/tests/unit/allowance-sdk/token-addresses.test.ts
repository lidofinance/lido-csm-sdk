import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { getContract } from 'viem';
import { createSharedServices } from '../../../src/sm-sdk/shared-services';
import { CONTRACT_NAMES } from '../../../src/common/constants/contract-names';
import { TOKENS } from '../../../src/common/constants/tokens';

vi.mock('viem', async (orig) => ({
  ...(await orig<typeof import('viem')>()),
  getContract: vi.fn(),
}));

vi.mock('@lidofinance/lido-ethereum-sdk', async (orig) => ({
  ...(await orig<typeof import('@lidofinance/lido-ethereum-sdk')>()),
  getEncodableContract: (c: unknown) => c,
}));

const ACCOUNT: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SPENDER: Address = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const OVERRIDDEN_STETH: Address = '0xdddddddddddddddddddddddddddddddddddddddd';

describe('createSharedServices token addresses', () => {
  it('hands flat stETH override to allowance', async () => {
    const fakeCore = {
      chain: { id: 560_048 },
      useAccount: async (a: unknown) =>
        typeof a === 'string'
          ? { address: a as `0x${string}`, type: 'json-rpc' as const }
          : (a ?? { address: ACCOUNT, type: 'json-rpc' as const }),
      keyedClient: {},
    };
    vi.mocked(getContract).mockReturnValue({
      address: OVERRIDDEN_STETH,
      read: { allowance: vi.fn(async () => 0n) },
    } as never);

    const { allowance } = createSharedServices({
      core: fakeCore as never,
      overridedAddresses: { [CONTRACT_NAMES.stETH]: OVERRIDDEN_STETH },
    });

    await allowance.allowance({
      account: ACCOUNT,
      token: TOKENS.steth,
      spender: SPENDER,
    });

    expect(getContract).toHaveBeenCalledWith(
      expect.objectContaining({ address: OVERRIDDEN_STETH }),
    );
  });
});
