import { describe, it, expect } from 'vitest';
import {
  encodeAbiParameters,
  encodeEventTopics,
  getAbiItem,
  zeroAddress,
  type Hex,
  type Log,
} from 'viem';
import { CuratedModuleAbi } from '../../../src/abi/index.js';
import { parseCuratedModuleNodeOperatorAddedEvents } from '../../../src/common/utils/parse-curated-module-node-operator-added-events.js';
import type { ReceiptLike } from '../../../src/tx-sdk/types.js';

const event = getAbiItem({
  abi: CuratedModuleAbi,
  name: 'NodeOperatorAdded',
});

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

describe('parseCuratedModuleNodeOperatorAddedEvents', () => {
  it('extracts nodeOperatorId from receipt', async () => {
    const receipt = { logs: [makeLog(99n)] } as ReceiptLike;
    const result = await parseCuratedModuleNodeOperatorAddedEvents(receipt);
    expect(result).toBe(99n);
  });

  it('skips non-matching logs', async () => {
    const receipt = { logs: [unrelatedLog, makeLog(5n)] } as ReceiptLike;
    const result = await parseCuratedModuleNodeOperatorAddedEvents(receipt);
    expect(result).toBe(5n);
  });

  it('throws when event not found', async () => {
    const receipt = { logs: [unrelatedLog] } as ReceiptLike;
    await expect(
      parseCuratedModuleNodeOperatorAddedEvents(receipt),
    ).rejects.toThrow('could not find NodeOperatorAdded event');
  });

  it('throws for empty logs', async () => {
    const receipt = { logs: [] } as unknown as ReceiptLike;
    await expect(
      parseCuratedModuleNodeOperatorAddedEvents(receipt),
    ).rejects.toThrow('could not find NodeOperatorAdded event');
  });
});
