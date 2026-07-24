import {
  NodeOperatorId,
  PermitSignatureShort,
  RewardProof,
} from '../common/index';
import { CommonTransactionProps } from '../tx-sdk/types';

export type AddBondResult = {
  current: bigint;
  required: bigint;
};

export type AddBondProps = CommonTransactionProps<AddBondResult> & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
  permit?: PermitSignatureShort;
};

export type CompensateLockedBondProps = CommonTransactionProps<bigint> & {
  nodeOperatorId: NodeOperatorId;
};

export type ClaimBondProps = CommonTransactionProps &
  Partial<RewardProof> & {
    nodeOperatorId: NodeOperatorId;
    amount: bigint;
  };

export type PullRewardsProps = Omit<ClaimBondProps, 'amount'>;

export type UnlockExpiredLockProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
};
