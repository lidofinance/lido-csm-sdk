import { DepositQueueBatch, RawDepositQueueBatch } from './types.js';

export const filterBatches = (
  allBatches: RawDepositQueueBatch[],
): DepositQueueBatch[] => {
  const result: DepositQueueBatch[] = [];
  let nextIndex = 0n;
  for (const batch of allBatches) {
    if (!nextIndex || nextIndex >= batch.batchIndex) {
      result.push(transformBatch(batch));
      nextIndex = batch.nextBatchIndex;
    }
  }

  return result;
};

const transformBatch = (batch: RawDepositQueueBatch): DepositQueueBatch => {
  return {
    nodeOperatorId: batch.nodeOperatorId,
    keysCount: batch.keysCount,
  };
};
