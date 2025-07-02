import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { Address } from 'viem';
import { Proof } from '../common/types.js';
import { findIndexAndLeaf } from '../common/utils/find-index-and-leaf.js';
import { AddressesTreeLeaf } from './types.js';

export const findProof = (
  tree: StandardMerkleTree<AddressesTreeLeaf>,
  address: Address,
): Proof | null => {
  const [index, leaf] = findIndexAndLeaf(tree, (leaf) => leaf[0] === address);
  if (index !== undefined && leaf) {
    return tree.getProof(index) as Proof;
  }

  return null;
};
