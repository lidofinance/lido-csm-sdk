import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { Hex } from 'viem';
import { NodeOperatorId, Proof } from '../common/tyles.js';
import {
  filterLeafs,
  findIndexAndLeaf,
} from '../common/utils/find-index-and-leaf.js';
import { KeyWithStrikes, StrikesTreeLeaf } from './types.js';

export const findProof = (
  tree: StandardMerkleTree<StrikesTreeLeaf>,
  pubkey: Hex,
): Proof | null => {
  const [index, leaf] = findIndexAndLeaf(tree, (leaf) => leaf[1] === pubkey);
  if (index !== undefined && leaf) {
    return tree.getProof(index) as Proof;
  }

  return null;
};

export const findLeaf = (
  tree: StandardMerkleTree<StrikesTreeLeaf>,
  pubkey: Hex,
): KeyWithStrikes | null => {
  const [, leaf] = findIndexAndLeaf(tree, (leaf) => leaf[1] === pubkey);
  return leaf ? wrapLeaf(leaf) : null;
};

export const filterLeafsByNodeOperator = (
  tree: StandardMerkleTree<StrikesTreeLeaf>,
  id: NodeOperatorId,
): KeyWithStrikes[] => {
  return filterLeafs(tree, (leaf) => BigInt(leaf[0]) === id).map(wrapLeaf);
};

export const wrapLeaf = (leaf: StrikesTreeLeaf): KeyWithStrikes => ({
  pubkey: leaf[1],
  strikes: leaf[2].map(Number),
});
