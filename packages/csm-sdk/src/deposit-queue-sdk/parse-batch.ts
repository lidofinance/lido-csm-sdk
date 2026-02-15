import { RawDepositQueueBatch } from './types.js';

export const parseBatch = (rawBatch: bigint): RawDepositQueueBatch => {
  const nextBatchIndex =
    rawBatch & 0xff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ffn;
  const keysCount = (rawBatch >> 128n) & 0xff_ff_ff_ff_ff_ff_ff_ffn;
  const nodeOperatorId = rawBatch >> 192n;

  return {
    nextBatchIndex,
    nodeOperatorId,
    keysCount: Number(keysCount),
  };
};
