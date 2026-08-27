import { Hex } from 'viem';
import { OperatorTopUpQueueKey } from './types';

export const selectOperatorQueueKeys = (
  operatorKeys: Hex[],
  positions: Map<Hex, number>,
): OperatorTopUpQueueKey[] => {
  const keys: OperatorTopUpQueueKey[] = [];

  operatorKeys.forEach((pubkey, index) => {
    const position = positions.get(pubkey.toLowerCase() as Hex);
    if (position !== undefined) keys.push({ pubkey, index, position });
  });

  return keys.sort((a, b) => a.position - b.position);
};
