import { Log } from 'viem';

export type NonPendingLog = Log<bigint, number, false>;

export const sortEventsByBlockNumber = (a: NonPendingLog, b: NonPendingLog) =>
  Number(a.blockNumber - b.blockNumber);
