import { OperatorCurveIdChange } from '../events-sdk/types.js';

/**
 * Gets the operator's curve ID that was active at a specific block number.
 *
 * This function looks through the historical curve ID changes and finds the most recent
 * curve ID change that occurred at or before the specified block number.
 *
 * @param blockNumber - The block number to find the curve ID for
 * @param curveIdChanges - Array of historical curve ID changes, should be sorted by block number
 * @param defaultCurveId - The default curve ID to use if no changes found
 * @returns The curve ID that was active at the specified block
 *
 * @example
 * ```ts
 * const curveIdChanges = [
 *   { curveId: 1n, blockNumber: 100n },
 *   { curveId: 2n, blockNumber: 200n },
 * ];
 *
 * getOperatorCurveIdByBlock(150n, curveIdChanges, 0n); // Returns 1n
 * getOperatorCurveIdByBlock(250n, curveIdChanges, 0n); // Returns 2n
 * getOperatorCurveIdByBlock(50n, curveIdChanges, 0n);  // Returns 0n (default)
 * ```
 */
export const getOperatorCurveIdByBlock = (
  blockNumber: bigint,
  curveIdChanges: OperatorCurveIdChange[],
  defaultCurveId: bigint,
): bigint => {
  // Find the last curve ID change that occurred at or before the given block
  const curveIdChange = curveIdChanges.findLast(
    (change) => blockNumber >= change.blockNumber,
  );

  // Return the found curve ID, or the provided default if no changes occurred before this block
  return curveIdChange?.curveId ?? defaultCurveId;
};
