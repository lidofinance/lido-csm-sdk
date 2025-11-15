import { Hash, Hex } from 'viem';
import { z } from 'zod';
import { StandardMerkleTreeData } from '../common/types.js';

export type RewardsTreeLeaf = [string, string]; // [nodeOperatorId, rewardAmount]

export type RewardsTree = StandardMerkleTreeData<RewardsTreeLeaf>;

export type RewardsReportV1 = {
  blockstamp: {
    block_hash: Hash;
    block_number: number;
    block_timestamp: number;
    ref_epoch: number;
    ref_slot: number;
    slot_number: number;
    state_root: Hex;
  };
  distributable: number;
  frame: [number, number];
  threshold: number;
  operators: Record<
    `${bigint}`,
    {
      distributed: number;
      validators: Record<
        `${number}`,
        {
          perf: {
            assigned: number;
            included: number;
          };
          slashed: boolean;
        }
      >;
    }
  >;
};

export type RewardsReportV2 = {
  blockstamp: {
    block_hash: Hash;
    block_number: number;
    block_timestamp: number;
    ref_epoch: number;
    ref_slot: number;
    slot_number: number;
    state_root: Hex;
  };
  distributable: number;
  distributed_rewards: number;
  rebate_to_protocol: number;
  frame: [number, number];
  operators: Record<
    `${bigint}`,
    {
      distributed_rewards: number;
      performance_coefficients: {
        attestations_weight: number;
        blocks_weight: number;
        sync_weight: number;
      };
      validators: Record<
        `${bigint}`,
        {
          attestation_duty: { assigned: number; included: number };
          distributed_rewards: number;
          performance: number;
          proposal_duty: { assigned: number; included: number };
          rewards_share: number; // 1 or 0.5834 - 1 means 6% fee, 0.5834 means 3.5% fee
          slashed: boolean;
          strikes: number;
          sync_duty: { assigned: number; included: number };
          threshold: number;
        }
      >;
    }
  >;
};

export type RewardsReport =
  | RewardsReportV1
  | RewardsReportV2
  | RewardsReportV2[];

export type OperatorRewards = {
  distributed: bigint;
  validatorsCount: number;
  validatorsOverThresholdCount: number;
  threshold: number;
};

const blockstampSchema = z.object({
  block_hash: z.string(),
  block_number: z.number(),
  block_timestamp: z.number(),
  ref_epoch: z.number(),
  ref_slot: z.number(),
  slot_number: z.number(),
  state_root: z.string(),
});

const rewardsReportV1Schema = z.object({
  blockstamp: blockstampSchema,
  distributable: z.number(),
  frame: z.tuple([z.number(), z.number()]),
  threshold: z.number(),
  operators: z.record(
    z.object({
      distributed: z.number(),
      validators: z.record(
        z.object({
          perf: z.object({
            assigned: z.number(),
            included: z.number(),
          }),
          slashed: z.boolean(),
        }),
      ),
    }),
  ),
});

const rewardsReportV2Schema = z.array(
  z.object({
    blockstamp: blockstampSchema,
    distributable: z.number(),
    distributed_rewards: z.number(),
    rebate_to_protocol: z.number(),
    frame: z.tuple([z.number(), z.number()]),
    operators: z.record(
      z.object({
        distributed_rewards: z.number(),
        performance_coefficients: z.object({
          attestations_weight: z.number(),
          blocks_weight: z.number(),
          sync_weight: z.number(),
        }),
        validators: z.record(
          z.object({
            attestation_duty: z.object({
              assigned: z.number(),
              included: z.number(),
            }),
            distributed_rewards: z.number(),
            performance: z.number(),
            proposal_duty: z.object({
              assigned: z.number(),
              included: z.number(),
            }),
            rewards_share: z.number(),
            slashed: z.boolean(),
            strikes: z.number(),
            sync_duty: z.object({ assigned: z.number(), included: z.number() }),
            threshold: z.number(),
          }),
        ),
      }),
    ),
  }),
);

const rewardsReportV2ArraySchema = z.array(rewardsReportV2Schema);

export const isRewardsReportV1 = (
  report: RewardsReport,
): report is RewardsReportV1 => {
  return rewardsReportV1Schema.safeParse(report).success;
};

export const isRewardsReportV2 = (
  report: RewardsReport,
): report is RewardsReportV2 => {
  return rewardsReportV2Schema.safeParse(report).success;
};

export const isRewardsReportV2Array = (
  report: RewardsReport,
): report is RewardsReportV2[] => {
  return rewardsReportV2ArraySchema.safeParse(report).success;
};

export type ValidatorRewards = {
  indexInReport: number;
  validatorIndex: string; // CL index
  performance: number; // Percentage (0-1)
  threshold: number; // Percentage (0-1)
  slashed: boolean;
  receivedShares: bigint; // stETH shares received
  frame: [number, number]; // epochs [start, end]
  refSlot: bigint;
  blockNumber: bigint;
};

type ValidatorRewardsEntity = ValidatorRewards & {
  curveId: bigint; // Curve ID applicable during the reward period
  fee: bigint; // Fee value from rewardsConfig
  startTimestamp: number; // Unix timestamp
  endTimestamp: number; // Unix timestamp
  receivedRewards: bigint; // stETH rewards in ETH (converted from shares)
  pubkey: Hex | undefined; // Validator public key
};

export type OperatorRewardsHistory = ValidatorRewardsEntity[];

export type StethPoolData = {
  totalPooledEther: bigint;
  totalShares: bigint;
};
