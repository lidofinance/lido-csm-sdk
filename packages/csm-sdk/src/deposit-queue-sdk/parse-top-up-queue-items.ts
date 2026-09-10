import { TopUpQueueItem } from './types';

export const parseTopUpQueueItems = (
  offset: bigint,
  items: readonly { nodeOperatorId: bigint; keyIndex: bigint }[],
): TopUpQueueItem[] =>
  items.map(({ nodeOperatorId, keyIndex }, i) => ({
    position: Number(offset) + i,
    nodeOperatorId,
    keyIndex: Number(keyIndex),
  }));
