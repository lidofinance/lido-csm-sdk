import { StethPoolData } from './types.js';

const PRECISION = 10n ** 27n;

/**
 * Converts stETH shares to ETH amount using the current pool ratio.
 * Also works for converting wstETH to stETH.
 */
export const convertSharesToEth = (
  shares: bigint,
  { totalPooledEther, totalShares }: StethPoolData,
): bigint => {
  return (shares * totalPooledEther * PRECISION) / (totalShares * PRECISION);
};

/**
 * Converts ETH amount to stETH shares using the current pool ratio.
 * Also works for converting stETH to wstETH.
 */
export const convertEthToShares = (
  eth: bigint,
  { totalPooledEther, totalShares }: StethPoolData,
): bigint => {
  return (eth * totalShares * PRECISION) / (totalPooledEther * PRECISION);
};
