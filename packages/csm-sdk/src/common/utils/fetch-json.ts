type Fetcher = <T>(
  url: string,
  params?: RequestInit,
  parser?: (text: string) => T,
) => Promise<T>;

export const fetchJson: Fetcher = async (url, params, parser) => {
  const response = await fetch(url, {
    method: 'GET',
    ...params,
  });

  if (!response.ok) {
    // TODO: throw error ???
    return undefined;
  }

  if (parser) {
    const text = await response.text();
    return parser(text);
  }
  return response.json();
};

export const fetchWithFallback = async <T>(
  urls: Array<string | null>,
  fetcher: (url: string) => Promise<T | null>,
): Promise<NonNullable<Awaited<T>> | void> => {
  for (const url of urls) {
    if (!url) continue;
    try {
      const result = await fetcher(url);
      if (result) return result;
    } catch {
      /* noop */
    }
  }
};
