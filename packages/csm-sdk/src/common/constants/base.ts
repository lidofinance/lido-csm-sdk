import { CHAINS } from '@lidofinance/lido-ethereum-sdk';

export const SUPPORTED_CHAINS = [CHAINS.Mainnet, CHAINS.Hoodi];
export type SUPPORTED_CHAINS = CHAINS.Mainnet | CHAINS.Hoodi;

export const PERCENT_BASIS = 10_000n;

export const DEFAULT_CLEAN_MAX_ITEMS = 1000;

export const MAX_BLOCKS_DEPTH_TWO_WEEKS = 100_000n;
