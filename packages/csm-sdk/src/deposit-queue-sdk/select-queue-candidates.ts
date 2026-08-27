import { Hex } from 'viem';
import { TopUpQueueEntry } from './types';

/**
 * Queue positions whose pubkey belongs to `operatorKeys` — a superset of the
 * operator's real entries, since a pubkey can repeat within an operator and
 * across operators. Narrows the queue before the per-position identity read.
 */
export const selectQueueCandidates = (
  operatorKeys: Hex[],
  entries: TopUpQueueEntry[],
): number[] => {
  const owned = new Set(operatorKeys.map((pubkey) => pubkey.toLowerCase()));

  return entries
    .filter(({ pubkey }) => owned.has(pubkey.toLowerCase()))
    .map(({ position }) => position);
};
