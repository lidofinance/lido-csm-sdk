import { Address } from 'viem';

export type FeeSplit = {
  recipient: Address;
  share: bigint;
};

export type NodeOperatorInfo = {
  totalAddedKeys: number;
  totalWithdrawnKeys: number;
  totalDepositedKeys: number;
  totalVettedKeys: number;
  stuckValidatorsCount: number;
  depositableValidatorsCount: number;
  targetLimit: number;
  targetLimitMode: number;
  totalExitedKeys: number;
  enqueuedCount: number;
  managerAddress: Address;
  rewardsAddress: Address;
  proposedManagerAddress?: Address;
  proposedRewardsAddress?: Address;
  extendedManagerPermissions: boolean;
  usedPriorityQueue: boolean;
};
