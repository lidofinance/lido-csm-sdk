import z from 'zod';

export const createMerkleTreeSchema = <ItemType extends z.ZodTypeAny>(
  leafSchema: ItemType,
) => {
  return z.object({
    format: z.literal('standard-v1'),
    tree: z.array(z.string()),
    values: z.array(
      z.object({
        value: leafSchema,
        treeIndex: z.number(),
      }),
    ),
    leafEncoding: z.array(z.string()),
  });
};

export type StandardMerkleTreeData<T> = z.infer<
  ReturnType<typeof createMerkleTreeSchema<z.ZodType<T>>>
>;
