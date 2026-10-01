/** Short cache duration (10 seconds) - optimizes multiple calls at same time */
export const CACHE_SHORT = 10 * 1000;

/** Long cache duration (60 minutes) - for rarely changing data */
export const CACHE_LONG = 60 * 60 * 1000;

/** Immutable cache - never expires, ignores version invalidation */
export const CACHE_IMMUTABLE = Infinity;
