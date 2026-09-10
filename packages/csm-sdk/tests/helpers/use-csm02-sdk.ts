import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { LidoSDKCsm02 } from '../../src';
import { usePublicClient } from './use-public-client';
import { useWalletClient } from './use-wallet-client';

let readOnly: LidoSDKCsm02 | null = null;
let withWallet: LidoSDKCsm02 | null = null;

export const useCsm02Sdk = (): LidoSDKCsm02 => {
  if (readOnly) return readOnly;
  const publicClient = usePublicClient();
  const core = new LidoSDKCore({
    chainId: publicClient.chain!.id,
    rpcProvider: publicClient,
  });
  readOnly = new LidoSDKCsm02({ core });
  return readOnly;
};

export const useCsm02SdkWithWallet = (): LidoSDKCsm02 => {
  if (withWallet) return withWallet;
  const publicClient = usePublicClient();
  const walletClient = useWalletClient();
  const core = new LidoSDKCore({
    chainId: publicClient.chain!.id,
    rpcProvider: publicClient,
    web3Provider: walletClient,
  });
  withWallet = new LidoSDKCsm02({ core });
  return withWallet;
};
