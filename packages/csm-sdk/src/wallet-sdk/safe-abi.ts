import { parseAbi } from 'viem';

export const SAFE_ABI = parseAbi([
  'function getThreshold() view returns (uint256)',
]);
