import { describe, it, expect } from 'vitest';
import z from 'zod';
import { createMerkleTreeSchema } from '../../../src/common/utils/create-merkle-tree-schema';

const addressLeafSchema = z.tuple([z.string()]);
const schema = createMerkleTreeSchema(addressLeafSchema);

const validData = {
  format: 'standard-v1' as const,
  tree: ['0xabc', '0xdef'],
  values: [{ value: ['0xAddress'], treeIndex: 0 }],
  leafEncoding: ['address'],
};

describe('createMerkleTreeSchema', () => {
  it('accepts valid merkle tree data', () => {
    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects wrong format literal', () => {
    const result = schema.safeParse({ ...validData, format: 'v2' });
    expect(result.success).toBe(false);
  });

  it('rejects missing tree field', () => {
    const { tree: _, ...noTree } = validData;
    const result = schema.safeParse(noTree);
    expect(result.success).toBe(false);
  });

  it('rejects missing values field', () => {
    const { values: _, ...noValues } = validData;
    const result = schema.safeParse(noValues);
    expect(result.success).toBe(false);
  });

  it('rejects missing leafEncoding field', () => {
    const { leafEncoding: _, ...noEncoding } = validData;
    const result = schema.safeParse(noEncoding);
    expect(result.success).toBe(false);
  });

  it('rejects values with wrong leaf shape', () => {
    const result = schema.safeParse({
      ...validData,
      values: [{ value: [123], treeIndex: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects values entry without treeIndex', () => {
    const result = schema.safeParse({
      ...validData,
      values: [{ value: ['0xAddr'] }],
    });
    expect(result.success).toBe(false);
  });

  it('works with different leaf schemas', () => {
    const numericSchema = createMerkleTreeSchema(z.tuple([z.number()]));
    const result = numericSchema.safeParse({
      ...validData,
      values: [{ value: [42], treeIndex: 0 }],
    });
    expect(result.success).toBe(true);
  });
});
