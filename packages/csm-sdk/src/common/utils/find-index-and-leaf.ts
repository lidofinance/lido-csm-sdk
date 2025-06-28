import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

export const findIndexAndLeaf = <T extends any[]>(
  tree: StandardMerkleTree<T>,
  lookup: (leaf: T) => boolean,
) => {
  for (const [index, leaf] of tree.entries()) {
    if (lookup(leaf)) return [index, leaf] as const;
  }
  return [undefined];
};

export const filterLeafs = <T extends any[]>(
  tree: StandardMerkleTree<T>,
  lookup: (leaf: T) => boolean,
) => {
  const result: T[] = [];
  for (const [, leaf] of tree.entries()) {
    if (lookup(leaf)) result.push(leaf);
  }
  return result;
};
