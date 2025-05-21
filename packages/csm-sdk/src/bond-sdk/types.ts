import { Hex } from 'viem';
import { NodeOperatorId } from '../common/index.js';
import { CommonTransactionProps, PermitSignature } from '../core-sdk/types.js';

export type AddBondProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
  permit?: PermitSignature;
};

export type CoverLockedBondProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
};

export type ClaimBondProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
  cumulativeFeeShares: bigint;
  rewardsProof: Hex[];
};

export type PullRewardsProps = Omit<ClaimBondProps, 'amount'>;
