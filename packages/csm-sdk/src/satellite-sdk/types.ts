import { Address } from 'viem';

export enum SearchMode {
  CURRENT_ADDRESSES = 0,
  PROPOSED_ADDRESSES = 1,
  ALL_ADDRESSES = 2,
}

export type FindOperatorIdsProps = {
  address: Address;
  offset?: bigint;
  limit?: bigint;
  searchMode?: SearchMode;
};

export type GetQueueBatchesProps = {
  queuePriority: bigint;
  startIndex?: bigint;
  limit?: bigint;
};

export type GetNodeOperatorsProps = {
  address: Address;
  offset?: bigint;
  limit?: bigint;
};
