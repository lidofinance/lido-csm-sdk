import { EncodableContract, LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import type { Abi, Address, GetContractReturnType, WalletClient } from 'viem';
import { CONTRACT_NAMES, MODULE_NAME, PerModule } from '../common/index';

export type ContractAddresses = {
  [contract in CONTRACT_NAMES]?: Address;
};

type ChainWideContract = CONTRACT_NAMES.stETH | CONTRACT_NAMES.wstETH;

/** Flat overrides apply to every module; a `MODULE_NAME` key scopes overrides to that module and wins over flat ones. Tokens are chain-wide, so flat only. */
export type OverridedAddresses = ContractAddresses &
  Partial<PerModule<Omit<ContractAddresses, ChainWideContract>>>;

export type CoreProps = {
  core: LidoSDKCore;
  contractAddresses: ContractAddresses;
  moduleId: bigint;
  moduleName?: MODULE_NAME;
  deploymentBlockNumber?: bigint;
  maxEventBlocksRange?: number;
  clApiUrl?: string;
  keysApiUrl?: string;
  feesMonitoringApiUrl?: string;
  skipHistoricalCalls?: boolean;
  ipfsGateways?: string[];
};

export type SdkProps = Omit<
  CoreProps,
  'contractAddresses' | 'moduleId' | 'deploymentBlockNumber'
> & {
  overridedAddresses?: OverridedAddresses;
};

export type BindedContract<abi extends Abi = Abi> = EncodableContract<
  GetContractReturnType<abi, WalletClient>
>;

export type VersionCheckResult = {
  version: bigint;
  supported: boolean;
};
