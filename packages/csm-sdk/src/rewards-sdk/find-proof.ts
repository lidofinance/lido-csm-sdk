import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { NodeOperatorId, Proof, RewardProof } from '../common/types.js';
import { RewardsTreeLeaf } from './types.js';
import { findIndexAndLeaf } from '../common/utils/find-index-and-leaf.js';

export const EMPTY_PROOF: RewardProof = { proof: [], shares: 0n };

export const findProofAndAmount = (
  tree: StandardMerkleTree<RewardsTreeLeaf>,
  nodeOperatorId: NodeOperatorId,
): RewardProof => {
  const id = nodeOperatorId.toString();
  const [index, leaf] = findIndexAndLeaf(tree, (leaf) => leaf[0] === id);
  if (index !== undefined && leaf) {
    return {
      proof: tree.getProof(index) as Proof,
      shares: BigInt(leaf[1]),
    };
  }

  return EMPTY_PROOF;
};
