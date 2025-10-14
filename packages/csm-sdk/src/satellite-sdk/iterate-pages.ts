import { Pagination } from './types.js';

type ContinueParams<T> = {
  items: T[];
} & Pagination;

export const iteratePages = async <T>(
  fetchPage: (pagination: Pagination) => Promise<readonly T[] | T[]>,
  pagination?: Pagination,
  getNextOffset?: (params: ContinueParams<T>) => bigint | undefined,
): Promise<T[]> => {
  const allResults: T[] = [];
  const limit = pagination?.limit ?? 1000n;
  let offset: bigint | undefined = pagination?.offset ?? 0n;

  while (offset !== undefined) {
    const items = await fetchPage({ offset, limit });
    allResults.push(...Array.from(items));

    offset = getNextOffset?.({ items: items as T[], offset, limit });
  }

  return allResults;
};

export const byTotalCount =
  (totalCount: bigint) =>
  ({ offset, limit }: Pagination) => {
    const nextOffset = offset + limit;
    return nextOffset < totalCount ? nextOffset : undefined;
  };

export const onePage = () => undefined;

export const byNextBatchIndex =
  <T extends { nextBatchIndex: bigint }>(tail: bigint) =>
  ({ items }: ContinueParams<T>) => {
    const nextIndex = items.at(-1)?.nextBatchIndex;
    return nextIndex && nextIndex < tail ? nextIndex : undefined;
  };
