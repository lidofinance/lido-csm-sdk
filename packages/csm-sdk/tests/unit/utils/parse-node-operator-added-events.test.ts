import { describe, it, expect } from 'vitest';
import {
  encodeAbiParameters,
  encodeEventTopics,
  getAbiItem,
  toEventHash,
  zeroAddress,
  type Hex,
  type Log,
} from 'viem';
import { CSModuleAbi } from '../../../src/abi/index';
import { parseNodeOperatorAddedEvents } from '../../../src/common/utils/parse-node-operator-added-events';
import type { ReceiptLike } from '../../../src/tx-sdk/types';

const event = getAbiItem({ abi: CSModuleAbi, name: 'NodeOperatorAdded' });

const makeLog = (nodeOperatorId: bigint): Log => {
  const topics = encodeEventTopics({
    abi: [event],
    eventName: 'NodeOperatorAdded',
    args: {
      nodeOperatorId,
      managerAddress: zeroAddress,
      rewardAddress: zeroAddress,
    },
  });
  // Non-indexed params: extendedManagerPermissions (bool)
  const data = encodeAbiParameters([{ type: 'bool' }], [false]);
  return {
    topics: topics as Log['topics'],
    data,
    address: zeroAddress,
    blockHash: '0x0' as Hex,
    blockNumber: 1n,
    transactionHash: '0x0' as Hex,
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
  };
};

const unrelatedLog: Log = {
  topics: [
    '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex,
  ],
  data: '0x' as Hex,
  address: zeroAddress,
  blockHash: '0x0' as Hex,
  blockNumber: 1n,
  transactionHash: '0x0' as Hex,
  transactionIndex: 0,
  logIndex: 0,
  removed: false,
};

describe('parseNodeOperatorAddedEvents', () => {
  it('extracts nodeOperatorId from receipt', async () => {
    const receipt = { logs: [makeLog(42n)] } as ReceiptLike;
    const result = await parseNodeOperatorAddedEvents(receipt);
    expect(result).toBe(42n);
  });

  it('skips non-matching logs and finds the event', async () => {
    const receipt = { logs: [unrelatedLog, makeLog(7n)] } as ReceiptLike;
    const result = await parseNodeOperatorAddedEvents(receipt);
    expect(result).toBe(7n);
  });

  it('returns first matching event', async () => {
    const receipt = { logs: [makeLog(1n), makeLog(2n)] } as ReceiptLike;
    const result = await parseNodeOperatorAddedEvents(receipt);
    expect(result).toBe(1n);
  });

  it('throws when event not found', async () => {
    const receipt = { logs: [unrelatedLog] } as ReceiptLike;
    await expect(parseNodeOperatorAddedEvents(receipt)).rejects.toThrow(
      'could not find NodeOperatorAdded event',
    );
  });

  it('throws for empty logs', async () => {
    const receipt = { logs: [] } as unknown as ReceiptLike;
    await expect(parseNodeOperatorAddedEvents(receipt)).rejects.toThrow(
      'could not find NodeOperatorAdded event',
    );
  });

  it('uses correct event signature', () => {
    const sig = toEventHash(event);
    expect(sig).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
