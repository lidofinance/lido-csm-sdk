import {
  findKeyInterval,
  KeyNumberValueInterval,
} from '../parameters-sdk/index.js';

/**
 * Calculates the fee for a validator based on its key index and curve ID.
 *
 * The fee is determined by finding the appropriate interval in the rewards configuration
 * that corresponds to the validator's key index. Different key ranges may have different
 * fee percentages based on the curve parameters.
 *
 * @param keyIndex - The 1-based index of the validator key
 * @param curveId - The curve ID that determines which rewards configuration to use
 * @param rewardsConfigsMap - Map of curve IDs to their respective rewards configurations (key number intervals with fee values)
 * @returns The calculated fee as a bigint (returns 0n if no configuration found)
 */
export const getValidatorFee = (
  keyIndex: number,
  curveId: bigint,
  rewardsConfigsMap: Map<bigint, KeyNumberValueInterval[]>,
): bigint => {
  const rewardsConfig = rewardsConfigsMap.get(curveId) ?? [];
  const fee = findKeyInterval(keyIndex, rewardsConfig)?.value ?? 0n;

  return fee;
};
