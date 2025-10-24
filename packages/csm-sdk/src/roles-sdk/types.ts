import type { Address } from 'viem';
import { NodeOperatorId, NodeOperatorShortInfo, ROLES } from '../common/index.js';
import { CommonTransactionProps } from '../core-sdk/types.js';

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
