import { createTestClient, http, publicActions, type TestClient } from 'viem';
import { anvilChainId, anvilRpcUrl } from './use-anvil-rpc';
import { chainById } from './chains';

const build = () =>
  createTestClient({
    chain: chainById(anvilChainId()),
    mode: 'anvil',
    transport: http(anvilRpcUrl()),
  }).extend(publicActions);

let cached: ReturnType<typeof build> | null = null;

export const useTestClient = (): TestClient<'anvil'> &
  ReturnType<typeof publicActions> => {
  if (!cached) cached = build();
  return cached as never;
};
