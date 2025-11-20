import type { Hex } from 'viem';

export type { StrikesTreeLeaf } from './parse-tree.js';

export type KeyStrikes = number[];

export type KeyWithStrikes = {
  pubkey: Hex;
  strikes: KeyStrikes;
};
