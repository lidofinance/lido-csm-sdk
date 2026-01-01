import { CSM_SUPPORTED_VERSION_BY_CONTRACT } from '../common/index.js';
import { Address } from 'viem';

export type CsmStatus = {
  isPausedModule: boolean;
  isPausedAccounting: boolean;
};

export type CsmContractsWithVersion =
  keyof typeof CSM_SUPPORTED_VERSION_BY_CONTRACT;

export type CsmVersions = Record<CsmContractsWithVersion, bigint>;

export const ShareLimitStatus = {
  FAR: 'FAR',
  APPROACHING: 'APPROACHING',
  EXHAUSTED: 'EXHAUSTED',
  REACHED: 'REACHED',
} as const;
export type ShareLimitStatus = keyof typeof ShareLimitStatus;

export type ShareLimitInfo = {
  active: bigint;
  activeLeft: bigint;
  capacity: bigint;
  queue: bigint;
  shareLimit: bigint;
};

export type ModuleDigest = {
  nodeOperatorsCount: bigint;
  activeNodeOperatorsCount: bigint;
  state: {
    id: number;
    stakingModuleAddress: Address;
    stakingModuleFee: bigint;
    treasuryFee: number;
    stakeShareLimit: bigint;
    status: number;
    name: string;
    lastDepositAt: bigint;
    lastDepositBlock: bigint;
    exitedValidatorsCount: bigint;
    priorityExitShareThreshold: number;
    maxDepositsPerBlock: bigint;
    minDepositBlockDistance: bigint;
  };
  summary: {
    totalExitedValidators: bigint;
    totalDepositedValidators: bigint;
    depositableValidatorsCount: bigint;
  };
};

export type ModulesResponse = {
  data: {
    nonce: number;
    type: string;
    id: number;
    stakingModuleAddress: string;
    moduleFee: number;
    treasuryFee: number;
    targetShare: number;
    status: number;
    name: string;
    lastDepositAt: number;
    lastDepositBlock: number;
    exitedValidatorsCount: number;
    active: boolean;
    lastChangedBlockHash: string;
  }[];
};

export type ModuleOperatorsResponse = {
  data: {
    operators: [
      {
        index: number;
        active: boolean;
        name: string;
        rewardAddress: string;
        stakingLimit: number;
        stoppedValidators: number;
        totalSigningKeys: number;
        usedSigningKeys: number;
        moduleAddress: string;
      },
    ];
  };
};
