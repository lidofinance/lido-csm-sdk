import { KeyNumberValueInterval } from './types.js';

/**
 * Find the interval that contains a specific key index
 * Intervals should be sorted by minKeyNumber in ascending order.
 *
 * @param keyIndex - The key index to look up (1-based, as keys are numbered starting from 1)
 * @param intervals - Array of key number value intervals, sorted by minKeyNumber
 * @returns The interval that contains the key index, or undefined if not found
 *
 * @example
 * const intervals = [
 *   { minKeyNumber: 1, value: 100n },
 *   { minKeyNumber: 10, value: 200n },
 *   { minKeyNumber: 20, value: 300n },
 * ];
 *
 * findKeyInterval(1, intervals);  // { minKeyNumber: 1, value: 100n }
 * findKeyInterval(5, intervals);  // { minKeyNumber: 1, value: 100n }
 * findKeyInterval(15, intervals); // { minKeyNumber: 10, value: 200n }
 * findKeyInterval(25, intervals); // { minKeyNumber: 20, value: 300n }
 */
export const findKeyInterval = (
  keyIndex: number,
  intervals: KeyNumberValueInterval[],
): KeyNumberValueInterval | undefined => {
  return intervals.findLast((interval) => keyIndex >= interval.minKeyNumber);
};
