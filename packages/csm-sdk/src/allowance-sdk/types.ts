import type { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import type { Address } from 'viem';
import type { CONTRACT_NAMES, Erc20Tokens } from '../common/index';
import type { WalletSDK } from '../wallet-sdk/wallet-sdk';

export type WithSpender<T> = T & { spender: Address };

export type AllowanceOverrideProps = {
  token: Erc20Tokens;
  amount: bigint;
  account: Address;
  spender: Address;
};

export type AllowanceSDKProps = {
  core: LidoSDKCore;
  wallet: WalletSDK;
  /** Chain-wide addresses from `resolveChainAddresses`. */
  tokenAddresses: Partial<
    Record<CONTRACT_NAMES.stETH | CONTRACT_NAMES.wstETH, Address>
  >;
};
