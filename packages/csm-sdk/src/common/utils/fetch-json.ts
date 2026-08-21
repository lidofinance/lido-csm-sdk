import { defaultSleep, getRetryDelay } from './get-retry-delay';

export type FetchFn<T> = (url: string) => Promise<T | null>;
export type ParseFn<T> = (text: string) => T;
export type ValidateFn<T> = (data: T) => boolean;

const RETRYABLE_STATUSES = new Set([429, 503]);
const FALLBACK_RETRY_ROUNDS = 2;
const FALLBACK_REQUEST_TIMEOUT_MS = 10_000;

export class HttpStatusError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfter: string | null,
  ) {
    super(`Request failed with ${status}`);
    this.name = 'HttpStatusError';
  }
}

type Fetcher = <T>(
  url: string,
  params?: RequestInit,
  parse?: ParseFn<T>,
) => Promise<T>;

export const fetchJson: Fetcher = async (url, params, parse) => {
  const response = await fetch(url, {
    method: 'GET',
    ...params,
  });

  if (!response.ok) {
    throw new HttpStatusError(
      response.status,
      response.headers.get('retry-after'),
    );
  }

  if (parse) {
    const text = await response.text();
    return parse(text);
  }
  return response.json();
};

type RoundOutcome<T> =
  | { result: NonNullable<Awaited<T>> }
  | { throttledUrls: string[]; minDelay: number };

const runFallbackRound = async <T>(
  urls: Array<string | null>,
  fetch: FetchFn<T>,
  round: number,
): Promise<RoundOutcome<T>> => {
  const throttledUrls: string[] = [];
  let minDelay = Infinity;

  for (const url of urls) {
    if (!url) continue;
    try {
      const result = await fetch(url);
      if (result) return { result };
    } catch (error) {
      if (
        error instanceof HttpStatusError &&
        RETRYABLE_STATUSES.has(error.status)
      ) {
        throttledUrls.push(url);
        minDelay = Math.min(minDelay, getRetryDelay(round, error.retryAfter));
      }
    }
  }

  return { throttledUrls, minDelay };
};

export const fetchWithFallback = async <T>(
  urls: Array<string | null>,
  fetch: FetchFn<T>,
  options?: { retries?: number; sleep?: (ms: number) => Promise<void> },
): Promise<NonNullable<Awaited<T>> | void> => {
  const { retries = FALLBACK_RETRY_ROUNDS, sleep = defaultSleep } =
    options ?? {};

  let pendingUrls = urls;
  for (let round = 0; ; round++) {
    const outcome = await runFallbackRound(pendingUrls, fetch, round);
    if ('result' in outcome) return outcome.result;

    const { throttledUrls, minDelay } = outcome;
    if (throttledUrls.length === 0 || round >= retries) return;

    await sleep(minDelay);
    pendingUrls = throttledUrls;
  }
};

type FetchOneOfProps<T> = {
  urls: Array<string | null>;
  validate?: ValidateFn<T>;
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
  timeout?: number;
} & (
  | {
      fetch?: FetchFn<T>;
      parse?: never;
    }
  | {
      fetch?: never;
      parse?: ParseFn<T>;
    }
);

type FetchOneOf = <T>(props: FetchOneOfProps<T>) => Promise<T | void>;

export const fetchOneOf: FetchOneOf = async ({
  urls,
  fetch,
  parse,
  validate,
  retries,
  sleep,
  timeout = FALLBACK_REQUEST_TIMEOUT_MS,
}) => {
  return fetchWithFallback(
    urls,
    async (url) => {
      const fetchFunction =
        fetch ??
        (async (url) =>
          fetchJson(url, { signal: AbortSignal.timeout(timeout) }, parse));
      const data = await fetchFunction(url);
      if (data && (!validate || validate(data))) {
        return data;
      }
      return null;
    },
    { retries, sleep },
  );
};
