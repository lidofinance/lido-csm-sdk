import { invariantArgument } from './sdk-error';

/**
 * Map `fn` over `items`, at most `limit` in flight, results in input order.
 * All-or-nothing: the first rejection stops scheduling and rejects.
 */
export const pooledMap = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  invariantArgument(
    Number.isInteger(limit) && limit > 0,
    'pool limit must be a positive integer',
  );

  const results = new Array<R>(items.length);
  let cursor = 0;
  let failed = false;

  const worker = async () => {
    while (cursor < items.length && !failed) {
      const index = cursor++;
      try {
        results[index] = await fn(items[index]!, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
};
