import type { Address } from 'viem';
import {
  NodeOperatorId,
  NodeOperatorShortInfo,
  RewardProof,
  ROLES,
} from '../common/index';
import { FeeSplit } from '../operator-sdk/types';
import { CommonTransactionProps } from '../tx-sdk/types';

export type ChangeRoleProps = CommonTransactionProps<NodeOperatorShortInfo> & {
  nodeOperatorId: NodeOperatorId;
  address: Address;
};

export type ResetRoleProps = CommonTransactionProps<NodeOperatorShortInfo> & {
  nodeOperatorId: NodeOperatorId;
};

export type ConfirmRoleProps = CommonTransactionProps<NodeOperatorShortInfo> & {
  nodeOperatorId: NodeOperatorId;
};

export type WithRole<T> = T & {
  role: ROLES;
};

export type SetCustomClaimerProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  claimerAddress: Address;
};

export type SetFeeSplitsProps = CommonTransactionProps &
  RewardProof & {
    nodeOperatorId: NodeOperatorId;
    feeSplits: FeeSplit[];
  };
