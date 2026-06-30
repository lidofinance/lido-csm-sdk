import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import type { PublicClient, WalletClient } from 'viem';
import { LidoSDKCsm } from '../../src';

// Escape hatch for tests that need a non-default wallet client (e.g.
// AA-extended, impersonated, or per-test isolated). Bypasses the cached
// `useCsmSdkWithWallet` so each call produces a fresh SDK instance.
export const makeCsmSdk = (
  publicClient: PublicClient,
  walletClient?: WalletClient,
): LidoSDKCsm => {
  const core = new LidoSDKCore({
    chainId: publicClient.chain!.id,
    rpcProvider: publicClient,
    ...(walletClient ? { web3Provider: walletClient } : {}),
  });
  return new LidoSDKCsm({ core });
};
