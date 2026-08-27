import { Hex } from 'viem';
import { NodeOperatorId } from '../common/types';
import { OperatorTopUpQueueKey, TopUpQueueItem } from './types';

export const buildOperatorQueueKeys = (
  id: NodeOperatorId,
  operatorKeys: Hex[],
  items: TopUpQueueItem[],
): OperatorTopUpQueueKey[] =>
  items
    .filter(
      ({ nodeOperatorId, keyIndex }) =>
        nodeOperatorId === id && operatorKeys[keyIndex] !== undefined,
    )
    .map(({ keyIndex, position }) => ({
      pubkey: operatorKeys[keyIndex] as Hex,
      index: keyIndex,
      position,
    }))
    .sort((a, b) => a.position - b.position);
