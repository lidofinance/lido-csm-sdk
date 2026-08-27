import { Hex } from 'viem';
import { NodeOperatorId } from '../common/types';

export type DepositQueuePointer = {
  head: bigint;
  tail: bigint;
};

export type RawDepositQueueBatch = {
  nodeOperatorId: bigint;
  keysCount: number;
  nextBatchIndex: bigint;
};

export type RawDepositQueueBatchWithIndex = {
  batchIndex: bigint;
} & RawDepositQueueBatch;

export type DepositQueueBatch = {
  nodeOperatorId: bigint;
  keysCount: number;
};

export type DepositQueueBatchInfo = {
  queuePriority: number;
  batches: DepositQueueBatch[];
};

export type CleanDepositQueueResult = {
  removed: bigint;
  lastRemovedAtDepth: bigint;
};

export type QueueBatchesPagination = {
  cursorIndex: bigint;
  limit: bigint;
};

export type TopUpQueueInfo = {
  enabled: boolean;
  limit: bigint;
  length: bigint;
  /** Absolute index of the queue head. Changes on rewind — treat as a generation counter. */
  head: bigint;
};

export type TopUpQueueEntry = {
  /** 0-based position from the head. 0 = next to be topped up. */
  position: number;
  pubkey: Hex;
};

/** Queue slot identity — what the contract actually stores per entry. */
export type TopUpQueueItem = {
  /** 0-based position from the head. */
  position: number;
  nodeOperatorId: NodeOperatorId;
  /** Key index within that operator. */
  keyIndex: number;
};

export type OperatorTopUpQueueKey = {
  pubkey: Hex;
  /** Key index within the operator — matches `KeyWithStatus.index`. */
  index: number;
  /** 0-based position in the global queue. UI displays `position + 1`. */
  position: number;
};

export type OperatorTopUpQueue = {
  /** Queue length at read time — the denominator. 0 when disabled. */
  total: number;
  /** This operator's queued keys, ascending by position. Empty when none are queued. */
  keys: OperatorTopUpQueueKey[];
};
