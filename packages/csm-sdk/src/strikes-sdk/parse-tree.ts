import z from 'zod';
import { createMerkleTreeSchema } from '../common/utils/index.js';

const StrikesLeaf = z.tuple([
  z.coerce.bigint(),
  z.string(),
  z.array(z.number()),
]);

export type StrikesTreeLeaf = z.infer<typeof StrikesLeaf>;

const StrikesMerkleTreeSchema = createMerkleTreeSchema(StrikesLeaf);

export const parseStrikesTree = (data: unknown) => {
  return StrikesMerkleTreeSchema.parse(data);
};
