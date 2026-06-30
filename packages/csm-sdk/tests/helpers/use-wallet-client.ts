import { createWalletClient, http, type WalletClient } from 'viem';
import { anvilChainId, anvilRpcUrl } from './use-anvil-rpc';
import { chainById } from './chains';
import { useAccount } from './use-account';

let cached: WalletClient | null = null;

export const useWalletClient = (): WalletClient => {
  if (cached) return cached;
  cached = createWalletClient({
    account: useAccount(),
    chain: chainById(anvilChainId()),
    transport: http(anvilRpcUrl()),
  });
  return cached;
};
