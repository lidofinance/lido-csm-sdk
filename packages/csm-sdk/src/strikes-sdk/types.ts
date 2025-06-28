import type { Hex } from 'viem';
import { StandardMerkleTreeData } from '../common/index.js';

export type StrikesTreeLeaf = [bigint, Hex, bigint[]];

export type StrikesTree = StandardMerkleTreeData<StrikesTreeLeaf>;

export type KeyStrikes = {
  pubkey: Hex;
  strikes: bigint[];
};
