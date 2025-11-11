import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import type { Address } from 'viem';
import { CSM_CONTRACT_NAMES, Erc20Tokens } from '../common/index.js';

export type CSM_ADDRESSES = {
  [key2 in CSM_CONTRACT_NAMES | Erc20Tokens]?: Address;
};

export type CsmCoreProps = {
  core: LidoSDKCore;
  overridedAddresses?: CSM_ADDRESSES;
  maxEventBlocksRange?: number;
  clApiUrl?: string;
};
