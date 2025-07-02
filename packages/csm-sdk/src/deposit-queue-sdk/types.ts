export type DepositQueuePointer = {
  head: bigint;
  tail: bigint;
};

export type DepositQueueInfo = {
  queueId: number;
  pointer: DepositQueuePointer;
  isEmpty: boolean;
  size: bigint;
};

export type DepositQueueStatus = {
  queues: DepositQueueInfo[];
  totalQueuedDeposits: bigint;
  lowestPriorityQueue: number;
};

export type RawDepositQueueBatch = {
  batchIndex: bigint;
  nodeOperatorId: bigint;
  keysCount: bigint;
  nextBatchIndex: bigint;
};

export type DepositQueueBatch = {
  nodeOperatorId: bigint;
  keysCount: bigint;
};

export type DepositQueueBatchInfo = {
  queuePriority: number;
  batches: DepositQueueBatch[];
};
