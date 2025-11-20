import { z } from 'zod';

export type RewardsReport = z.infer<typeof RewardsReportSchema>;
export type RewardsReportV1 = z.infer<typeof RewardsReportV1Schema>;
export type RewardsReportV2 = z.infer<typeof RewardsReportV2Schema>;

const BlockstampSchema = z.object({
  block_hash: z.string(),
  block_number: z.number(),
  block_timestamp: z.number(),
  ref_epoch: z.number(),
  ref_slot: z.number(),
  slot_number: z.number(),
  state_root: z.string(),
});

const RewardsReportV1Schema = z.object({
  blockstamp: BlockstampSchema,
  distributable: z.coerce.bigint(),
  frame: z.tuple([z.number(), z.number()]),
  threshold: z.number(),
  operators: z.record(
    z.templateLiteral([z.bigint()]),
    z.object({
      distributed: z.coerce.bigint(),
      validators: z.record(
        z.templateLiteral([z.bigint()]),
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

const RewardsReportV2Schema = z.object({
  blockstamp: BlockstampSchema,
  distributable: z.coerce.bigint(),
  distributed_rewards: z.coerce.bigint(),
  rebate_to_protocol: z.coerce.bigint(),
  frame: z.tuple([z.number(), z.number()]),
  operators: z.record(
    z.templateLiteral([z.bigint()]),
    z.object({
      distributed_rewards: z.coerce.bigint(),
      performance_coefficients: z.object({
        attestations_weight: z.number(),
        blocks_weight: z.number(),
        sync_weight: z.number(),
      }),
      validators: z.record(
        z.templateLiteral([z.bigint()]),
        z.object({
          attestation_duty: z.object({
            assigned: z.number(),
            included: z.number(),
          }),
          distributed_rewards: z.coerce.bigint(),
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
});

const RewardsReportV2ArraySchema = z.array(RewardsReportV2Schema);

const RewardsReportSchema = z.union([
  RewardsReportV1Schema,
  RewardsReportV2Schema,
  RewardsReportV2ArraySchema,
]);

export const parseReport = (data: unknown): RewardsReport => {
  return RewardsReportSchema.parse(data);
};

export const isRewardsReportV1 = (
  report: RewardsReport,
): report is RewardsReportV1 => {
  return RewardsReportV1Schema.safeParse(report).success;
};

export const isRewardsReportV2 = (
  report: RewardsReport,
): report is RewardsReportV2 => {
  return RewardsReportV2Schema.safeParse(report).success;
};

export const isRewardsReportV2Array = (
  report: RewardsReport,
): report is RewardsReportV2[] => {
  return RewardsReportV2ArraySchema.safeParse(report).success;
};
