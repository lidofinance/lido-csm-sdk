import { Hex } from 'viem';
import { NodeOperatorId } from '../common/index';
import { CommonTransactionProps } from '../tx-sdk/types';

export type ReportProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  penaltyType: Hex;
  amount: bigint;
  details: string;
};

export type CancelProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
};

export type OperatorWithLockedBond = {
  nodeOperatorId: NodeOperatorId;
  locked: bigint;
};
