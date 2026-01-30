import type { Address } from 'viem';
import { NodeOperatorId, NodeOperatorShortInfo } from '../common/index.js';
import { CommonTransactionProps } from '../tx-sdk/types.js';

export type ChangeAddressesProps = CommonTransactionProps<NodeOperatorShortInfo> & {
  nodeOperatorId: NodeOperatorId;
  newManagerAddress: Address;
  newRewardAddress: Address;
};

export type {
  ChangeRoleProps,
  ConfirmRoleProps,
  ResetRoleProps,
  WithRole,
} from '../roles-sdk/types.js';
