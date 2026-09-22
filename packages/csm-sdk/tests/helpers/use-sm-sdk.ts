import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { LidoSmSDK } from '../../src';
import { usePublicClient } from './use-public-client';

let cached: LidoSmSDK | null = null;

export const useSmSdk = (): LidoSmSDK => {
  if (cached) return cached;
  const publicClient = usePublicClient();
  const core = new LidoSDKCore({
    chainId: publicClient.chain!.id,
    rpcProvider: publicClient,
  });
  cached = new LidoSmSDK({ core });
  return cached;
};
