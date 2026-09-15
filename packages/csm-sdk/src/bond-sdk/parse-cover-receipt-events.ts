import { decodeEventLog, getAbiItem, Hex, toEventHash } from 'viem';
import { AccountingAbi } from '../abi/Accounting';
import { ERROR_CODE, SDKError } from '../common/index';
import { ReceiptLike } from '../tx-sdk/types';

// BondLock._changeBondLock emits BondLockRemoved when amount hits 0,
// BondLockChanged otherwise — one state transition, two event shapes
const BOND_LOCK_EVENTS = [
  getAbiItem({ abi: AccountingAbi, name: 'BondLockChanged' }),
  getAbiItem({ abi: AccountingAbi, name: 'BondLockRemoved' }),
] as const;

const BOND_LOCK_SIGNATURES = new Set<Hex>(
  BOND_LOCK_EVENTS.map((event) => toEventHash(event)),
);

export const parseCoverReceiptEvents = async (
  receipt: ReceiptLike,
): Promise<bigint> => {
  for (const log of receipt.logs) {
    if (!log.topics[0] || !BOND_LOCK_SIGNATURES.has(log.topics[0])) continue;
    const parsed = decodeEventLog({
      abi: BOND_LOCK_EVENTS,
      strict: true,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
    });
    return parsed.eventName === 'BondLockRemoved' ? 0n : parsed.args.newAmount;
  }
  throw new SDKError({
    message:
      'could not find BondLockChanged or BondLockRemoved event in transaction',
    code: ERROR_CODE.TRANSACTION_ERROR,
  });
};
