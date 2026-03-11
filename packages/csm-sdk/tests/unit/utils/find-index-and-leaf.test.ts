import { describe, it, expect } from 'vitest';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import {
  findIndexAndLeaf,
  filterLeafs,
} from '../../../src/common/utils/find-index-and-leaf.js';

const ADDR_A = '0x000000000000000000000000000000000000000a';
const ADDR_B = '0x000000000000000000000000000000000000000b';
const ADDR_C = '0x000000000000000000000000000000000000000c';

const makeTree = (values: [string][]) =>
  StandardMerkleTree.of(values, ['address']);

describe('findIndexAndLeaf', () => {
  const tree = makeTree([[ADDR_A], [ADDR_B], [ADDR_C]]);

  it('returns [index, leaf] when found', () => {
    const result = findIndexAndLeaf(tree, (leaf) => leaf[0] === ADDR_B);
    expect(result).toHaveLength(2);
    const [index, leaf] = result;
    expect(index).toBeTypeOf('number');
    expect(leaf![0]).toBe(ADDR_B);
  });

  it('returns [undefined] when not found', () => {
    const result = findIndexAndLeaf(tree, () => false);
    expect(result).toEqual([undefined]);
  });

  it('returns first match when multiple could match', () => {
    const dupeTree = makeTree([[ADDR_A], [ADDR_A], [ADDR_B]]);
    const result = findIndexAndLeaf(dupeTree, (leaf) => leaf[0] === ADDR_A);
    expect(result).toHaveLength(2);
    expect(result[1]![0]).toBe(ADDR_A);
  });
});

describe('filterLeafs', () => {
  const tree = makeTree([[ADDR_A], [ADDR_B], [ADDR_A], [ADDR_C]]);

  it('returns all matching leaves', () => {
    const result = filterLeafs(tree, (leaf) => leaf[0] === ADDR_A);
    expect(result).toHaveLength(2);
    expect(result.every((leaf) => leaf[0] === ADDR_A)).toBe(true);
  });

  it('returns empty array when nothing matches', () => {
    const result = filterLeafs(tree, () => false);
    expect(result).toEqual([]);
  });

  it('returns all leaves when predicate always true', () => {
    const result = filterLeafs(tree, () => true);
    expect(result).toHaveLength(4);
  });
});
