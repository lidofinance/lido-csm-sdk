import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';

import { CONTRACT_NAMES } from './contract-names.js';
import { PerSupportedChain } from './supported-chains.js';

// TODO: Add CM contract addresses when deployed
export const CM_CONTRACT_ADDRESSES: PerSupportedChain<{
  [key2 in CONTRACT_NAMES]?: Address;
}> = {
  [CHAINS.Mainnet]: {},
  [CHAINS.Hoodi]: {},
};

// TODO: Add CM module IDs when deployed
export const CM_MODULE_IDS: PerSupportedChain<number> = {
  [CHAINS.Mainnet]: 4,
  [CHAINS.Hoodi]: 5,
};

// TODO: Add CM deployment block numbers when deployed
export const CM_DEPLOYMENT_BLOCK_NUMBERS: PerSupportedChain<
  bigint | undefined
> = {
  [CHAINS.Mainnet]: undefined,
  [CHAINS.Hoodi]: undefined,
};
