export const PERCENT_BASIS = 10_000n;

// Max effective balance for 0x01 withdrawal credentials: a fixed 32 ETH, in wei.
// Matches StakingRouter.MAX_EFFECTIVE_BALANCE_WC_TYPE_01(); a protocol invariant,
// so it is inlined rather than read on-chain.
export const MAX_EFFECTIVE_BALANCE_WC_TYPE_01_WEI = 32_000_000_000_000_000_000n;

export const WEI_PER_GWEI = 1_000_000_000n;

export const DEFAULT_CLEAN_MAX_ITEMS = 1000;

export const MAX_BLOCKS_DEPTH_TWO_WEEKS = 100_000n;

// TODO: rename file
