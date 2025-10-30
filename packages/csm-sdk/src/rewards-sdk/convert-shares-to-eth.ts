import { StethPoolData } from './types.js';

/**
 * Converts stETH shares to ETH amount using the current pool ratio.
 *
 * @param shares - The amount of stETH shares to convert
 * @param poolData - The current stETH pool data containing total pooled ether and total shares
 * @returns The equivalent ETH amount
 */
export const convertSharesToEth = (
  shares: bigint,
  poolData: StethPoolData,
): bigint => {
  return (shares * poolData.totalPooledEther) / poolData.totalShares;
};
