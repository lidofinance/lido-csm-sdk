const MAX_RETRY_DELAY_MS = 5000;
const BASE_RETRY_DELAY_MS = 500;

/** Delay before the next attempt. `attempt` is 0-based. */
export const getRetryDelay = (
  attempt: number,
  retryAfter: string | null,
): number => {
  const seconds =
    retryAfter !== null && /^\d+$/.test(retryAfter.trim())
      ? Number(retryAfter)
      : Number.NaN;
  if (Number.isFinite(seconds)) {
    return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  }
  return Math.min(BASE_RETRY_DELAY_MS * 3 ** attempt, MAX_RETRY_DELAY_MS);
};

export const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
