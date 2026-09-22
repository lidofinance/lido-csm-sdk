import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { getContract } from 'viem';
import { AllowanceSDK } from '../../../src/allowance-sdk/allowance-sdk';
import { WalletSDK } from '../../../src/wallet-sdk/wallet-sdk';
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

describe('AllowanceSDK.tokenAddresses override', () => {
  it('resolves stETH through the overridden address instead of COMMON_ADDRESSES', async () => {
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

    const wallet = new WalletSDK({ core: fakeCore as never });
    const sdk = new AllowanceSDK({
      core: fakeCore as never,
      wallet,
      tokenAddresses: { [CONTRACT_NAMES.stETH]: OVERRIDDEN_STETH },
    });

    await sdk.allowance({
      account: ACCOUNT,
      token: TOKENS.steth,
      spender: SPENDER,
    });

    expect(getContract).toHaveBeenCalledWith(
      expect.objectContaining({ address: OVERRIDDEN_STETH }),
    );
  });
});
