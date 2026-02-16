import { Address } from 'viem';

export enum SearchMode {
  CURRENT_ADDRESSES = 0,
  PROPOSED_ADDRESSES = 1,
  ALL_ADDRESSES = 2,
}

export type Pagination = {
  offset: bigint;
  limit: bigint;
};

export type NodeOperatorDiscoveryInfo = {
  id: bigint;
  managerAddress: Address;
  rewardAddress: Address;
  extendedManagerPermissions: boolean;
  proposedManagerAddress: Address;
  proposedRewardAddress: Address;
  curveId: bigint;
};
