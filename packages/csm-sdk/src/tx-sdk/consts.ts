import { Erc20Tokens, TOKENS } from '../common/index';

/**
 * Measured on a hoodi fork: estimate(real signed permit) minus estimate(allowance override), rounded up to 1_000.
 * Valid on every supported chain (same token bytecode); an approximation pinned within 15% by an integration test, not a live estimate.
 */
export const PERMIT_GAS_OVERHEAD: Record<Erc20Tokens, bigint> = {
  [TOKENS.steth]: 68_000n,
  [TOKENS.wsteth]: 50_000n,
};
