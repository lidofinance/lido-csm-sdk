/** Short cache duration (10 seconds) - optimizes multiple calls at same time */
export const CACHE_SHORT = 10 * 1000;

/** Mid-range cache duration (10 minutes) - balances freshness and performance */
export const CACHE_MID = 10 * 60 * 1000;

/** Long cache duration (60 minutes) - for rarely changing data */
export const CACHE_LONG = 60 * 60 * 1000;
