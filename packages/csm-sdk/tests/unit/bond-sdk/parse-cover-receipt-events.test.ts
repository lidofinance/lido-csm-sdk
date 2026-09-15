import { describe, it, expect } from 'vitest';
import {
  encodeAbiParameters,
  encodeEventTopics,
  zeroAddress,
  type Hex,
  type Log,
} from 'viem';
import { AccountingAbi } from '../../../src/abi/index';
import { parseCoverReceiptEvents } from '../../../src/bond-sdk/parse-cover-receipt-events';
import type { ReceiptLike } from '../../../src/tx-sdk/types';

const UNRELATED_TOPIC =
  '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex;

const makeLog = (topics: Hex[], data: Hex = '0x'): Log => ({
  topics: topics as Log['topics'],
  data,
  address: zeroAddress,
  blockHash: '0x0' as Hex,
  blockNumber: 1n,
  transactionHash: '0x0' as Hex,
  transactionIndex: 0,
  logIndex: 0,
  removed: false,
});

const makeBondLockChangedLog = (nodeOperatorId: bigint, newAmount: bigint) =>
  makeLog(
    encodeEventTopics({
      abi: AccountingAbi,
      eventName: 'BondLockChanged',
      args: { nodeOperatorId },
    }) as Hex[],
    encodeAbiParameters(
      [{ type: 'uint256' }, { type: 'uint256' }],
      [newAmount, 0n],
    ),
  );

const makeBondLockRemovedLog = (nodeOperatorId: bigint) =>
  makeLog(
    encodeEventTopics({
      abi: AccountingAbi,
      eventName: 'BondLockRemoved',
      args: { nodeOperatorId },
    }) as Hex[],
  );

const asReceipt = (logs: Log[]) => ({ logs }) as ReceiptLike;

describe('parseCoverReceiptEvents', () => {
  it('extracts newAmount from BondLockChanged', async () => {
    await expect(
      parseCoverReceiptEvents(asReceipt([makeBondLockChangedLog(1n, 5n)])),
    ).resolves.toBe(5n);
  });

  it('returns 0n for BondLockRemoved (full compensation)', async () => {
    await expect(
      parseCoverReceiptEvents(asReceipt([makeBondLockRemovedLog(1n)])),
    ).resolves.toBe(0n);
  });

  it('skips unrelated logs and still finds BondLockRemoved', async () => {
    await expect(
      parseCoverReceiptEvents(
        asReceipt([makeLog([UNRELATED_TOPIC]), makeBondLockRemovedLog(1n)]),
      ),
    ).resolves.toBe(0n);
  });

  it('throws when neither event is found', async () => {
    await expect(
      parseCoverReceiptEvents(asReceipt([makeLog([UNRELATED_TOPIC])])),
    ).rejects.toThrow(
      'could not find BondLockChanged or BondLockRemoved event',
    );
  });
});
