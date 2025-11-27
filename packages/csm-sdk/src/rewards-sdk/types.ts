import { Hex } from 'viem';

export type { RewardsTreeLeaf } from './parse-rewards-tree.js';

export type {
  RewardsReport,
  RewardsReportV1,
  RewardsReportV2,
} from './parse-report.js';

export type OperatorRewards = {
  shares: bigint;
  distributed: bigint;
  validatorsCount: number;
  validatorsOverThresholdCount: number;
  threshold: number;
};

export type ValidatorRewards = {
  indexInReport: number;
  validatorIndex: `${number}`; // CL index
  performance: number; // Percentage (0-1)
  threshold: number; // Percentage (0-1)
  slashed: boolean;
  receivedShares: bigint; // stETH shares received
  frame: [number, number]; // epochs [start, end]
  refSlot: bigint;
  blockNumber: bigint;
  rewardShare: number; // Percentage (0-1)
};

export type ValidatorRewardsEntity = ValidatorRewards & {
  fee: bigint; // Fee value from rewardsConfig
  startTimestamp: number; // Unix timestamp
  endTimestamp: number; // Unix timestamp
  receivedRewards: bigint; // stETH rewards in ETH (converted from shares)
  pubkey: Hex | undefined; // Validator public key
};

export type OperatorRewardsHistory = ValidatorRewardsEntity[];

export type RewardsQueryOptions = {
  /** Use current stETH rate instead of historical rate at report block */
  useCurrentRate?: boolean;
};
