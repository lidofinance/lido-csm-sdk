import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import type { Abi, Address, GetContractReturnType, WalletClient } from 'viem';
import { CONTRACT_NAMES, Erc20Tokens } from '../common/index.js';

export type ContractAddresses = {
  [contract in CONTRACT_NAMES | Erc20Tokens]?: Address;
};

export type ModuleName = CONTRACT_NAMES.csModule | CONTRACT_NAMES.curatedModule;

export type CoreProps = {
  core: LidoSDKCore;
  contractAddresses: ContractAddresses;
  moduleId: number;
  moduleName?: ModuleName;
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

export type BindedContract<abi extends Abi | readonly unknown[] = Abi> =
  GetContractReturnType<abi, WalletClient>;
