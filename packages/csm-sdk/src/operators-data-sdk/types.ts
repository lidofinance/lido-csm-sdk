import { NodeOperatorId } from '../common/index.js';
import { CommonTransactionProps } from '../tx-sdk/types.js';

export type OperatorInfo = {
  name: string;
  description: string;
  ownerEditsRestricted: boolean;
};

export type SetOperatorDataProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  info: OperatorInfo;
};

export type SetOperatorDataByOwnerProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  name: string;
  description: string;
};

export type OperatorData = OperatorInfo;
