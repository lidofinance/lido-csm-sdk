export const requestWithBlockStep = <TResultEntry>(
  props: {
    step: number;
    fromBlock: bigint;
    toBlock: bigint;
  },
  request: (args: { fromBlock: bigint; toBlock: bigint }) => TResultEntry,
): TResultEntry[] => {
  const { step, fromBlock, toBlock } = props;
  let from = fromBlock;
  const result: TResultEntry[] = [];
  while (from <= toBlock) {
    const to = from + BigInt(step);
    const nextResult = request({
      fromBlock: from,
      toBlock: to > toBlock ? toBlock : to,
    });
    result.push(nextResult);
    from = to + 1n;
  }
  return result;
};
