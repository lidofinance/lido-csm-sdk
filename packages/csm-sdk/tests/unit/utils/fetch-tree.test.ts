import { describe, it, expect, vi } from 'vitest';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { parseTree, verifyRoot } from '../../../src/common/utils/fetch-tree.js';

const values: [string][] = [
  ['0x000000000000000000000000000000000000000a'],
  ['0x000000000000000000000000000000000000000b'],
];
const tree = StandardMerkleTree.of(values, ['address']);
const treeJson = JSON.stringify(tree.dump());

describe('parseTree', () => {
  it('parses JSON string into StandardMerkleTree with default parser', () => {
    const parse = parseTree();
    const result = parse(treeJson);
    expect(result).toBeInstanceOf(StandardMerkleTree);
    expect(result.root).toBe(tree.root);
  });

  it('uses custom parse function', () => {
    const customParse = vi.fn(JSON.parse);
    const parse = parseTree(customParse);
    const result = parse(treeJson);
    expect(customParse).toHaveBeenCalledWith(treeJson);
    expect(result).toBeInstanceOf(StandardMerkleTree);
  });
});

describe('verifyRoot', () => {
  it('returns true when root matches', () => {
    const validate = verifyRoot(tree.root);
    expect(validate(tree)).toBe(true);
  });

  it('returns true for case-insensitive match', () => {
    const validate = verifyRoot(tree.root.toUpperCase());
    expect(validate(tree)).toBe(true);
  });

  it('returns false when root does not match', () => {
    const validate = verifyRoot('0xdeadbeef');
    expect(validate(tree)).toBe(false);
  });
});
