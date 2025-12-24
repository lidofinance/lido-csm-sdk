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
