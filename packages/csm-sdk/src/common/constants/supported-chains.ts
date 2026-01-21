import { CHAINS } from '@lidofinance/lido-ethereum-sdk';

export const SUPPORTED_CHAINS = [CHAINS.Mainnet, CHAINS.Hoodi];
export type SUPPORTED_CHAINS = CHAINS.Mainnet | CHAINS.Hoodi;

export type PerSupportedChain<T> = {
  [key in SUPPORTED_CHAINS]: T;
};
