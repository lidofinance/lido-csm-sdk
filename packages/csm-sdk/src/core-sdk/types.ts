import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import type {
  Abi,
  Address,
  GetContractReturnType,
  Hex,
  WalletClient,
} from 'viem';
import { CONTRACT_NAMES, MODULE_NAME } from '../common/index.js';

export type ContractAddresses = {
  [contract in CONTRACT_NAMES]?: Address;
};

export type CoreProps = {
  core: LidoSDKCore;
  contractAddresses: ContractAddresses;
  moduleId: number;
  moduleName?: MODULE_NAME;
  deploymentBlockNumber?: bigint;
  maxEventBlocksRange?: number;
  clApiUrl?: string;
  keysApiUrl?: string;
  feesMonitoringApiUrl?: string;
  skipHistoricalCalls?: boolean;
  wcPrefix?: Hex;
};

export type SdkProps = Omit<
  CoreProps,
  'contractAddresses' | 'moduleId' | 'deploymentBlockNumber'
> & {
  overridedAddresses?: ContractAddresses;
};

export type BindedContract<abi extends Abi | readonly unknown[] = Abi> =
  GetContractReturnType<abi, WalletClient>;

export type VersionCheckResult = {
  version: bigint;
  supported: boolean;
};
