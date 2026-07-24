export const sortByBlockNumber = (
  a: { blockNumber: bigint },
  b: { blockNumber: bigint },
) => Number(a.blockNumber - b.blockNumber);

export const sortRewardsByRefSlot = (
  a: { refSlot: bigint },
  b: { refSlot: bigint },
) => Number(b.refSlot - a.refSlot);
