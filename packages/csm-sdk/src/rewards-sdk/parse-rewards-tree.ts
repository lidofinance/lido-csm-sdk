import z from 'zod';
import { createMerkleTreeSchema } from '../common/utils/index.js';

const RewardsLeaf = z.tuple([z.coerce.bigint(), z.coerce.bigint()]);

export type RewardsTreeLeaf = z.infer<typeof RewardsLeaf>;

const RewardsMerkleTreeSchema = createMerkleTreeSchema(RewardsLeaf);

export const parseRewardsTree = (data: unknown) => {
  return RewardsMerkleTreeSchema.parse(data);
};
