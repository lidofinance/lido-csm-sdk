import { Page } from '../common/utils/read-all-pages';

export const byNextBatchIndex =
  <T extends { nextBatchIndex: bigint }>(tail: bigint) =>
  ({ items }: Page<T>) => {
    const nextIndex = items.at(-1)?.nextBatchIndex;
    return nextIndex && nextIndex < tail ? nextIndex : undefined;
  };
