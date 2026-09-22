import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { WalletSDK } from '../../../src/wallet-sdk/wallet-sdk';

const A: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const B: Address = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const CHAIN_ID = 560_048;

const build = () => {
  const getCapabilities = vi.fn(async () => ({
    [CHAIN_ID]: { atomic: { status: 'supported' } },
  }));
  const isContract = vi.fn(async () => true);
  const useAccount = vi.fn(async (a: unknown) => a ?? { address: A });
  const wallet = new WalletSDK({
    core: {
      chain: { id: CHAIN_ID },
      useWalletClient: () => ({ getCapabilities }),
      isContract,
      useAccount,
    } as never,
  });
  return { wallet, getCapabilities, isContract };
};

describe('WalletSDK caching', () => {
  it('probes wallet_getCapabilities once per address within the cache window', async () => {
    const { wallet, getCapabilities } = build();
    await wallet.isAbstractAccount(A);
    await wallet.isAbstractAccount(A);
    await wallet.isAbstractAccount(B);
    expect(getCapabilities).toHaveBeenCalledTimes(2);
  });

  it('probes eth_getCode once per resolved address', async () => {
    const { wallet, isContract } = build();
    await wallet.isMultisig();
    await wallet.isMultisig({ address: A } as never);
    await wallet.isMultisig({ address: B } as never);
    expect(isContract).toHaveBeenCalledTimes(2);
  });
});
