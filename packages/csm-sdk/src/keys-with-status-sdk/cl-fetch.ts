import { CL_RETRY_ATTEMPTS } from './consts';
import { ClPreparedKey, parseClResponse } from './parse-cl-response';

/** Throttled or down — a GET fan-out would only make it worse. */
const NON_FALLBACK_STATUSES = new Set([429, 503]);

const RETRYABLE_STATUSES = new Set([429, 503]);

const MAX_RETRY_DELAY_MS = 5000;
const BASE_RETRY_DELAY_MS = 500;

export class ClRequestError extends Error {
  constructor(
    message: string,
    /** HTTP status, absent when there was no response to read a status from. */
    public readonly status: number | undefined,
    /**
     * Endpoint may not support the request as issued. Not proof on its own: a
     * CORS preflight rejection looks identical to a network outage.
     */
    public readonly isCapabilitySignal: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ClRequestError';
  }
}

/** Delay before the next attempt. `attempt` is 0-based. */
export const getRetryDelay = (
  attempt: number,
  retryAfter: string | null,
): number => {
  // Digits only: `Number('')` and `Number('  ')` are 0, i.e. "retry now"
  // against an endpoint that just throttled us. Also excludes HTTP-dates.
  const seconds =
    retryAfter !== null && /^\d+$/.test(retryAfter.trim())
      ? Number(retryAfter)
      : Number.NaN;
  if (Number.isFinite(seconds)) {
    return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  }
  return Math.min(BASE_RETRY_DELAY_MS * 3 ** attempt, MAX_RETRY_DELAY_MS);
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export type ClFetchOptions = {
  init?: RequestInit;
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Issue one CL validators request and parse it. Resolves with the full
 * parsed payload or throws {@link ClRequestError} — never a partial result.
 */
export const fetchClValidators = async (
  url: string,
  {
    init,
    retries = CL_RETRY_ATTEMPTS,
    sleep = defaultSleep,
  }: ClFetchOptions = {},
): Promise<ClPreparedKey[]> => {
  for (let attempt = 0; ; attempt++) {
    let response: Response;

    try {
      response = await fetch(url, init);
    } catch (error) {
      throw new ClRequestError(
        'CL request failed to reach the endpoint',
        undefined,
        true,
        { cause: error },
      );
    }

    if (response.ok) {
      try {
        return parseClResponse(await response.text());
      } catch (error) {
        // A proxy answering 200 with an HTML error page lands here. Flag it so
        // the GET fallback gets a chance; on the GET path the flag is ignored.
        throw new ClRequestError(
          'CL response did not match the expected schema',
          response.status,
          true,
          { cause: error },
        );
      }
    }

    if (RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
      await sleep(getRetryDelay(attempt, response.headers.get('retry-after')));
      continue;
    }

    throw new ClRequestError(
      `CL request failed with ${response.status}`,
      response.status,
      !NON_FALLBACK_STATUSES.has(response.status),
    );
  }
};
