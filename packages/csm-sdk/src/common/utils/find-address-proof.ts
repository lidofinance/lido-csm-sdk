import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { Address, isAddressEqual } from 'viem';
import { Proof } from '../types';
import { findIndexAndLeaf } from './find-index-and-leaf';

export type AddressTreeLeaf = [Address];

export const findAddressProof = (
  tree: StandardMerkleTree<AddressTreeLeaf>,
  address: Address,
): Proof | null => {
  const [index, leaf] = findIndexAndLeaf(tree, (leaf) =>
    isAddressEqual(leaf[0], address),
  );
  if (index !== undefined && leaf) {
    return tree.getProof(index) as Proof;
  }
  return null;
};
