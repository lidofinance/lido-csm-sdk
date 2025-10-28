export type FetchFn<T> = (url: string) => Promise<T | null>;
export type ParseFn<T> = (text: string) => T;
export type ValidateFn<T> = (data: T) => boolean;

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
    // TODO: throw error ???
    return undefined;
  }

  if (parse) {
    const text = await response.text();
    return parse(text);
  }
  return response.json();
};

export const fetchWithFallback = async <T>(
  urls: Array<string | null>,
  fetch: FetchFn<T>,
): Promise<NonNullable<Awaited<T>> | void> => {
  for (const url of urls) {
    if (!url) continue;
    try {
      const result = await fetch(url);
      if (result) return result;
    } catch {
      /* noop */
    }
  }
};

type FetchOneOfProps<T> = {
  urls: Array<string | null>;
  validate?: ValidateFn<T>;
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
}) => {
  return fetchWithFallback(urls, async (url) => {
    const fetchFunction =
      fetch ?? (async (url) => fetchJson(url, undefined, parse));
    const data = await fetchFunction(url);
    if (data && (!validate || validate(data))) {
      return data;
    }
    return null;
  });
};
