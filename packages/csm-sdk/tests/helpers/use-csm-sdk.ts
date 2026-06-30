import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { LidoSDKCsm } from '../../src';
import { usePublicClient } from './use-public-client';
import { useWalletClient } from './use-wallet-client';

let readOnly: LidoSDKCsm | null = null;
let withWallet: LidoSDKCsm | null = null;

export const useCsmSdk = (): LidoSDKCsm => {
  if (readOnly) return readOnly;
  const publicClient = usePublicClient();
  const core = new LidoSDKCore({
    chainId: publicClient.chain!.id,
    rpcProvider: publicClient,
  });
  readOnly = new LidoSDKCsm({ core });
  return readOnly;
};

export const useCsmSdkWithWallet = (): LidoSDKCsm => {
  if (withWallet) return withWallet;
  const publicClient = usePublicClient();
  const walletClient = useWalletClient();
  const core = new LidoSDKCore({
    chainId: publicClient.chain!.id,
    rpcProvider: publicClient,
    web3Provider: walletClient,
  });
  withWallet = new LidoSDKCsm({ core });
  return withWallet;
};
