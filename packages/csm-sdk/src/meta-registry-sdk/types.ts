import { NodeOperatorId } from '../common/index.js';
import { CommonTransactionProps } from '../tx-sdk/types.js';

export type OperatorMetadata = {
  name: string;
  description: string;
  ownerEditsRestricted: boolean;
};

export type SetOperatorDataProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
} & Omit<OperatorMetadata, 'ownerEditsRestricted'>;
