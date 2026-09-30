import type { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import type { Address } from 'viem';
import type { CONTRACT_NAMES } from '../common/index';
import type { WalletSDK } from '../wallet-sdk/wallet-sdk';

export type WithSpender<T> = T & { spender: Address };

export type AllowanceSDKProps = {
  core: LidoSDKCore;
  wallet: WalletSDK;
  /** Overrides for stETH/wstETH addresses (flat entries of `SdkProps.overridedAddresses`; tokens are chain-wide). */
  tokenAddresses?: Partial<
    Record<CONTRACT_NAMES.stETH | CONTRACT_NAMES.wstETH, Address>
  >;
};
