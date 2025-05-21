import { PermitSignature } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';
import { ROLES } from './constants/roles.js';
import { TOKENS } from './constants/tokens.js';

export type DepositDataKey = {
  pubkey: string;
  signature: string;
};

export type PerToken<T> = {
  [K in TOKENS]: T;
};

export type WithToken<T> = T & {
  token: TOKENS;
};

export type Erc20Tokens = Exclude<TOKENS, TOKENS.eth>;

export type PermitSignatureShort = Pick<
  PermitSignature,
  'v' | 'r' | 's' | 'value' | 'deadline'
>;

export type NodeOperatorId = bigint;

export type NodeOperatorShortInfo = {
  nodeOperatorId: NodeOperatorId;
  managerAddress: Address;
  rewardsAddress: Address;
};

export type NodeOperator = {
  id: NodeOperatorId;
  roles: ROLES[];
};

export type BondBalance = {
  required: bigint;
  current: bigint;
  locked: bigint;
  delta: bigint;
  isInsufficient: boolean;
};
