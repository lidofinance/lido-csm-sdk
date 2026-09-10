import { Address } from 'viem';

export type CsmStatus = {
  isPausedModule: boolean;
  isPausedAccounting: boolean;
};

export const ShareLimitStatus = {
  FAR: 'FAR',
  APPROACHING: 'APPROACHING',
  EXHAUSTED: 'EXHAUSTED',
  REACHED: 'REACHED',
} as const;
export type ShareLimitStatus = keyof typeof ShareLimitStatus;

export const WCType = {
  TYPE_01: 1,
  TYPE_02: 2,
} as const;

export type ShareLimitInfo = {
  active: bigint;
  activeLeft: bigint;
  capacity: bigint;
  queue: bigint;
  shareLimit: bigint;
  /** Display-only stake view. Enforcement/status must use the equivalent fields above. */
  activeWei: bigint;
  activeLeftWei: bigint;
  capacityWei: bigint;
  queueWei: bigint;
};

export type ModuleDigest = {
  nodeOperatorsCount: bigint;
  activeNodeOperatorsCount: bigint;
  state: {
    id: bigint;
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
    withdrawalCredentialsType: number;
    validatorsBalanceGwei: bigint;
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

export const StakingModuleStatus = {
  ACTIVE: 0,
  DEPOSITS_PAUSED: 1,
  STOPPED: 2,
} as const;
export type StakingModuleStatus =
  (typeof StakingModuleStatus)[keyof typeof StakingModuleStatus];

export type ModuleRegistration =
  | { registered: false; isActive: false }
  | { registered: true; isActive: boolean };

export type ModuleOperatorsResponse = {
  data: {
    operators: {
      index: number;
      active: boolean;
      name: string;
      rewardAddress: string;
      stakingLimit: number;
      stoppedValidators: number;
      totalSigningKeys: number;
      usedSigningKeys: number;
      moduleAddress: string;
    }[];
  };
};
