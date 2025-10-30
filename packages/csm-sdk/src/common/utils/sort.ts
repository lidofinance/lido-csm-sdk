import { Log } from 'viem';

type NonPendingLog = Log<bigint, number, false>;

type ByBlockNumber = Pick<NonPendingLog, 'blockNumber'>;

export const sortEventsByBlockNumber = (a: ByBlockNumber, b: ByBlockNumber) =>
  Number(a.blockNumber - b.blockNumber);

export const sortRewardsByRefSlot = (
  a: { refSlot: bigint },
  b: { refSlot: bigint },
) => Number(b.refSlot - a.refSlot);
