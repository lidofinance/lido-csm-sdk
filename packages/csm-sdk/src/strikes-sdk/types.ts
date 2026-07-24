import type { Hex } from 'viem';

export type { StrikesTreeLeaf } from './parse-tree';

export type KeyStrikes = number[];

export type KeyWithStrikes = {
  pubkey: Hex;
  strikes: KeyStrikes;
};
