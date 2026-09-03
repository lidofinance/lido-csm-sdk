import { Address } from 'viem';
import { NodeOperatorId, NodeOperatorShortInfo } from '../common/types';

export enum SearchMode {
  CURRENT_ADDRESSES = 0,
  PROPOSED_ADDRESSES = 1,
  ALL_ADDRESSES = 2,
  CLAIMER = 3,
  ANY_ROLE = 4,
}

export type Pagination = {
  offset: bigint;
  limit: bigint;
};

export type NodeOperatorDiscoveryInfo = NodeOperatorShortInfo & {
  proposedManagerAddress?: Address;
  proposedRewardsAddress?: Address;
};

export type NodeOperatorLockedBond = {
  nodeOperatorId: NodeOperatorId;
  locked: bigint;
  until: number;
};
