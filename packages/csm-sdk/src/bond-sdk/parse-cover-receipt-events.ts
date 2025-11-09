import { ERROR_CODE, SDKError } from '@lidofinance/lido-ethereum-sdk';
import { decodeEventLog, getAbiItem, Hex, toEventHash } from 'viem';
import { CSAccountingAbi } from '../abi/CSAccounting.js';
import { ReceiptLike } from '../tx-sdk/types.js';

const BOND_LOCK_CHANGED_EVENT = getAbiItem({
  abi: CSAccountingAbi,
  name: 'BondLockChanged',
});

const BOND_LOCK_CHANGED_SIGNATURE = toEventHash(BOND_LOCK_CHANGED_EVENT);

export const parseCoverReceiptEvents = async (
  receipt: ReceiptLike,
): Promise<bigint> => {
  for (const log of receipt.logs) {
    // skips non-relevant events
    if (log.topics[0] !== BOND_LOCK_CHANGED_SIGNATURE) continue;
    const parsedLog = decodeEventLog({
      abi: [BOND_LOCK_CHANGED_EVENT],
      strict: true,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
    });
    return parsedLog.args.newAmount;
  }
  throw new SDKError({
    message: 'could not find BondLockChanged event in transaction',
    code: ERROR_CODE.TRANSACTION_ERROR,
  });
};
