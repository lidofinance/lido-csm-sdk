export const byNextBatchIndex =
  <T extends { nextBatchIndex: bigint }>(tail: bigint) =>
  ({ items }: { items: T[]; offset: bigint; limit: bigint }) => {
    const nextIndex = items.at(-1)?.nextBatchIndex;
    return nextIndex && nextIndex < tail ? nextIndex : undefined;
  };
