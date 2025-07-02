import { RawDepositQueueBatch } from './types.js';

export const parseBatch = (
  rawBatch: bigint,
  batchIndex: bigint,
): RawDepositQueueBatch => {
  const nodeOperatorId = rawBatch & 0xffffffffffffffffn;
  const keysCount = (rawBatch >> 64n) & 0xffffffffffffffffn;
  const nextBatchIndex = rawBatch >> 128n;

  return {
    batchIndex,
    nodeOperatorId,
    keysCount,
    nextBatchIndex,
  };
};
