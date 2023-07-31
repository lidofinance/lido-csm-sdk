import type { Address } from 'viem';
import { NodeOperatorId } from '../common/index.js';
import { CommonTransactionProps } from '../core-sdk/types.js';

export type ChangeRoleProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  address: Address;
};

export type ResetRoleProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
};

export type ConfirmRoleProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
};
