import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { LidoSDKCm } from '../../src';
import { usePublicClient } from './use-public-client';
import { useWalletClient } from './use-wallet-client';

let readOnly: LidoSDKCm | null = null;
let withWallet: LidoSDKCm | null = null;

export const useCmSdk = (): LidoSDKCm => {
  if (readOnly) return readOnly;
  const publicClient = usePublicClient();
  const core = new LidoSDKCore({
    chainId: publicClient.chain!.id,
    rpcProvider: publicClient,
  });
  readOnly = new LidoSDKCm({ core });
  return readOnly;
};

export const useCmSdkWithWallet = (): LidoSDKCm => {
  if (withWallet) return withWallet;
  const publicClient = usePublicClient();
  const walletClient = useWalletClient();
  const core = new LidoSDKCore({
    chainId: publicClient.chain!.id,
    rpcProvider: publicClient,
    web3Provider: walletClient,
  });
  withWallet = new LidoSDKCm({ core });
  return withWallet;
};
