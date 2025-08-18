import { RawDepositQueueBatch } from './types.js';

export const parseBatch = (
  rawBatch: bigint,
  batchIndex: bigint,
): RawDepositQueueBatch => {
  const nextBatchIndex = rawBatch & 0xffffffffffffffffffffffffffffffffn;
  const keysCount = (rawBatch >> 128n) & 0xffffffffffffffffn;
  const nodeOperatorId = rawBatch >> 192n;

  return {
    batchIndex,
    nodeOperatorId,
    keysCount,
    nextBatchIndex,
  };
};
