import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';

import { CONTRACT_NAMES } from './contract-names.js';
import { SUPPORTED_CHAINS } from './base.js';

// TODO: Add CM contract addresses when deployed
export const CM_CONTRACT_ADDRESSES: {
  [key in SUPPORTED_CHAINS]?: {
    [key2 in CONTRACT_NAMES]?: Address;
  };
} = {
  [CHAINS.Mainnet]: {},
  [CHAINS.Hoodi]: {},
};

// TODO: Add CM module IDs when deployed
export const CM_MODULE_ID_BY_CHAIN: {
  [key in SUPPORTED_CHAINS]?: number;
} = {
  [CHAINS.Mainnet]: undefined,
  [CHAINS.Hoodi]: undefined,
};

// TODO: Add CM deployment block numbers when deployed
export const CM_DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN: {
  [key in SUPPORTED_CHAINS]?: bigint;
} = {
  [CHAINS.Mainnet]: undefined,
  [CHAINS.Hoodi]: undefined,
};

// TODO: Add CM supported versions when contracts are deployed
export const CM_SUPPORTED_VERSION_BY_CONTRACT = {} as const;
