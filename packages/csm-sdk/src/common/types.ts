import { PermitSignature } from '@lidofinance/lido-ethereum-sdk';
import { Address, Hex } from 'viem';
import { ROLES } from './constants/roles';
import { TOKENS } from './constants/tokens';

export type DepositDataKey = {
  pubkey: Hex;
  signature: Hex;
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
  extendedManagerPermissions: boolean;
  curveId: bigint;
};

export type NodeOperatorInviteInfo = {
  nodeOperatorId: NodeOperatorId;
  extendedManagerPermissions: boolean;
  curveId: bigint;
  role: ROLES;
};

/** @deprecated */
export type NodeOperator = {
  id: NodeOperatorId;
  roles: ROLES[];
};

/** @deprecated */
export type NodeOperatorInvite = {
  id: NodeOperatorId;
  role: ROLES;
};

export type BondBalance = {
  required: bigint;
  current: bigint;
  locked: bigint;
  debt: bigint;
  pendingToSplit: bigint;
  delta: bigint;
  isInsufficient: boolean;
};

export type Proof = Hex[];

export type RewardProof = {
  shares: bigint;
  proof: Proof;
};

export type Rewards = RewardProof & {
  available: bigint; // steth amount
};
