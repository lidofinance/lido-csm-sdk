import { DepositQueueBatch } from './types.js';

export const filterEmptyBatches = (
  allQueueBatches: DepositQueueBatch[][],
  depositableKeysCount: number[],
): DepositQueueBatch[][] => {
  const remainingKeys: Map<bigint, number> = new Map(
    Object.entries(depositableKeysCount).map(([k, v]) => [BigInt(k), v]),
  );

  return allQueueBatches.map((queueBatches) => {
    const filteredBatches: DepositQueueBatch[] = [];

    for (const batch of queueBatches) {
      const { nodeOperatorId, keysCount } = batch;
      const operatorRemainingKeys = remainingKeys.get(nodeOperatorId) ?? 0;

      const actualKeysCount = Math.min(keysCount, operatorRemainingKeys);

      if (actualKeysCount <= 0) {
        continue;
      }

      filteredBatches.push({
        nodeOperatorId,
        keysCount: actualKeysCount,
      });

      // Update remaining keys for this operator
      remainingKeys.set(
        nodeOperatorId,
        operatorRemainingKeys - actualKeysCount,
      );
    }

    return filteredBatches;
  });
};
