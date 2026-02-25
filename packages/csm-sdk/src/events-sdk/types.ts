import { BlockNumber, BlockTag, Hex } from 'viem';
import { NodeOperatorId } from '../common/index.js';

// Events Props

export type NonPendingBlockTag = Exclude<BlockTag, 'pending'>;
export type EventRangeProps = {
  step?: number;
  fromBlock?: BlockNumber | NonPendingBlockTag;
  toBlock?: BlockNumber | NonPendingBlockTag;
  maxBlocksDepth?: bigint;
};

// Operator Curve ID Change

export type OperatorCurveIdChange = {
  curveId: bigint;
  blockNumber: bigint;
};

// Penalty Records

type PenaltyBase = {
  nodeOperatorId: NodeOperatorId;
  blockNumber: bigint;
  transactionHash: Hex;
  timestamp: number;
};

export type PenaltyReported = PenaltyBase & {
  type: 'reported';
  amount: bigint;
  // V2 fields (GeneralDelayedPenalty) — absent for V1 events
  penaltyType?: Hex;
  additionalFine?: bigint;
  details?: string;
};

export type PenaltyCancelled = PenaltyBase & {
  type: 'cancelled';
  amount: bigint;
};

export type PenaltyCompensated = PenaltyBase & {
  type: 'compensated';
  amount: bigint;
};

export type PenaltySettled = PenaltyBase & {
  type: 'settled';
};

export type PenaltyRecord =
  | PenaltyReported
  | PenaltyCancelled
  | PenaltyCompensated
  | PenaltySettled;
