import { createPublicClient, http, type PublicClient } from 'viem';
import { anvilChainId, anvilRpcUrl } from './use-anvil-rpc';
import { chainById } from './chains';

let cached: PublicClient | null = null;

export const usePublicClient = (): PublicClient => {
  if (cached) return cached;
  cached = createPublicClient({
    chain: chainById(anvilChainId()),
    transport: http(anvilRpcUrl()),
  });
  return cached;
};
