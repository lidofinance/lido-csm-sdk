import { StethPoolData } from './types.js';

const PRECISION = 10n ** 27n;

/**
 * Converts stETH shares to ETH amount using the current pool ratio.
 *
 * @param shares - The amount of stETH shares to convert
 * @param poolData - The current stETH pool data containing total pooled ether and total shares
 * @returns The equivalent ETH amount
 */
export const convertSharesToEth = (
  shares: bigint,
  { totalPooledEther, totalShares }: StethPoolData,
): bigint => {
  return (shares * totalPooledEther * PRECISION) / (totalShares * PRECISION);
};

/**
 * Converts ETH amount to stETH shares using the current pool ratio.
 *
 * @param eth - The amount of ETH to convert
 * @param poolData - The current stETH pool data containing total pooled ether and total shares
 * @returns The equivalent stETH shares amount
 */
export const convertEthToShares = (
  eth: bigint,
  { totalPooledEther, totalShares }: StethPoolData,
): bigint => {
  return (eth * totalShares * PRECISION) / (totalPooledEther * PRECISION);
};
