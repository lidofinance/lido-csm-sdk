import { AllowanceSDK } from '../allowance-sdk/allowance-sdk';
import { resolveChainAddresses, SdkProps } from '../core-sdk/index';
import { KeysCacheSDK } from '../keys-cache-sdk/keys-cache-sdk';
import { WalletSDK } from '../wallet-sdk/wallet-sdk';
import { SharedServices } from './types';

/** Builds the chain-scoped services (wallet detection, allowances, keys cache) shared across module SDKs. */
export const createSharedServices = (props: SdkProps): SharedServices => {
  const wallet = new WalletSDK({ core: props.core });
  const allowance = new AllowanceSDK({
    core: props.core,
    wallet,
    tokenAddresses: resolveChainAddresses({
      chainId: props.core.chain.id,
      overridedAddresses: props.overridedAddresses,
    }),
  });
  const keysCache = new KeysCacheSDK({ core: props.core });
  return { wallet, allowance, keysCache };
};
