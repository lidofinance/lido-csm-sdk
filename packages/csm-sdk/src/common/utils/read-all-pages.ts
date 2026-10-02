import { invariantArgument } from './sdk-error';

export const MAX_PAGE_LIMIT = 1000n;

export const assertPageLimit = (limit: bigint) =>
  invariantArgument(
    limit >= 1n && limit <= MAX_PAGE_LIMIT,
    `Pagination limit must be between 1 and ${MAX_PAGE_LIMIT}`,
  );

export type PageArgs = {
  offset: bigint;
  limit: bigint;
  blockNumber: bigint;
};

export type Page<T> = {
  items: readonly T[];
  /** Total item count as seen by this page's read; ends the scan when `count`/`next` are absent. */
  total?: bigint;
};

export type ReadAllPagesProps<T> = {
  publicClient: { getBlockNumber: () => Promise<bigint> };
  readPage: (args: PageArgs) => Promise<Page<T>>;
  /** Pin to an existing block instead of fetching one. */
  blockNumber?: bigint;
  limit?: bigint;
  /** Static total read at the pinned block. */
  count?: (blockNumber: bigint) => Promise<bigint>;
  /** Cursor: next offset after a page, `undefined` to stop. */
  next?: (page: Page<T>, args: PageArgs) => bigint | undefined;
};

/**
 * Reads every page sequentially at one pinned block. Any failing page rejects
 * and the partial result is discarded.
 */
export const readAllPages = async <T>({
  publicClient,
  readPage,
  blockNumber: pinned,
  limit = MAX_PAGE_LIMIT,
  count,
  next,
}: ReadAllPagesProps<T>): Promise<T[]> => {
  assertPageLimit(limit);
  const blockNumber = pinned ?? (await publicClient.getBlockNumber());
  const staticTotal = await count?.(blockNumber);

  const results: T[] = [];
  let offset: bigint | undefined = 0n;

  while (offset !== undefined) {
    const args: PageArgs = { offset, limit, blockNumber };
    const page: Page<T> = await readPage(args);
    results.push(...page.items);

    if (next) {
      offset = next(page, args);
    } else {
      const total = staticTotal ?? page.total ?? 0n;
      const nextOffset: bigint = offset + limit;
      offset = nextOffset < total ? nextOffset : undefined;
    }
  }

  return results;
};
