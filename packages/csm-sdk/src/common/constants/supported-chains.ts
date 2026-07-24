import { CHAINS } from '@lidofinance/lido-ethereum-sdk';

export const SUPPORTED_CHAINS = [CHAINS.Mainnet, CHAINS.Hoodi] as const;
export type SUPPORTED_CHAINS = (typeof SUPPORTED_CHAINS)[number];

export type PerSupportedChain<T> = {
  [key in SUPPORTED_CHAINS]: T;
};
