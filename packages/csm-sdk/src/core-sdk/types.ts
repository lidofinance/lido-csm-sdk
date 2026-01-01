import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import type { Address } from 'viem';
import { CONTRACT_NAMES, Erc20Tokens } from '../common/index.js';

export type ContractAddresses = {
  [contract in CONTRACT_NAMES | Erc20Tokens]?: Address;
};

export type CoreProps = {
  core: LidoSDKCore;
  contractAddresses: ContractAddresses;
  moduleId: number;
  deploymentBlockNumber?: bigint;
  maxEventBlocksRange?: number;
  clApiUrl?: string;
  keysApiUrl?: string;
  feesMonitoringApiUrl?: string;
  skipHistoricalCalls?: boolean;
};

export type SdkProps = Omit<
  CoreProps,
  'contractAddresses' | 'moduleId' | 'deploymentBlockNumber'
> & {
  overridedAddresses?: ContractAddresses;
};
