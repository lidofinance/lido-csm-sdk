import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { NodeOperatorId, Proof, RewardProof } from '../common/types.js';
import { RewardsTreeLeaf } from './types.js';
import { findIndexAndLeaf } from '../common/utils/find-index-and-leaf.js';

export const EMPTY_PROOF: RewardProof = { proof: [], shares: 0n };

export const findProofAndAmount = (
  tree: StandardMerkleTree<RewardsTreeLeaf> | null,
  nodeOperatorId: NodeOperatorId,
) => {
  if (!tree) return EMPTY_PROOF;

  const [index, leaf] = findIndexAndLeaf(
    tree,
    (leaf) => leaf[0] === nodeOperatorId,
  );
  if (index !== undefined && leaf) {
    return {
      proof: tree.getProof(index) as Proof,
      shares: leaf[1],
    } as RewardProof;
  }

  return EMPTY_PROOF;
};
