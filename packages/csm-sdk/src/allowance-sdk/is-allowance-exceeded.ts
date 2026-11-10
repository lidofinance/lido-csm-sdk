import { BaseError } from 'viem';

const ALLOWANCE_EXCEEDED_MARKERS = [
  'ALLOWANCE_EXCEEDED',
  'transfer amount exceeds allowance',
];

const hasMarker = (error: unknown): boolean =>
  error instanceof Error &&
  ALLOWANCE_EXCEEDED_MARKERS.some((marker) => error.message.includes(marker));

/** stETH / wstETH string reverts raised when an `eth_estimateGas` stateOverride was not applied. */
export const isAllowanceExceeded = (error: unknown): boolean =>
  error instanceof BaseError ? !!error.walk(hasMarker) : hasMarker(error);
