import { Hex } from 'viem';
import { NodeOperatorId } from '../common/index.js';
import { CommonTransactionProps } from '../core-sdk/types.js';

export type ReportProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  blockHash: Hex;
  amount: bigint;
};

export type CancelProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
};

export type OperatorWithLockedBond = {
  nodeOperatorId: NodeOperatorId;
  locked: bigint;
};
