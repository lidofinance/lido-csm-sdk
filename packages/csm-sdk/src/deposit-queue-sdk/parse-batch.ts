import { RawDepositQueueBatch } from './types.js';

export const parseBatch = (rawBatch: bigint): RawDepositQueueBatch => {
  const nextBatchIndex = rawBatch & 0xffffffffffffffffffffffffffffffffn;
  const keysCount = (rawBatch >> 128n) & 0xffffffffffffffffn;
  const nodeOperatorId = rawBatch >> 192n;

  return {
    nodeOperatorId,
    keysCount: Number(keysCount),
    nextBatchIndex,
  };
};
