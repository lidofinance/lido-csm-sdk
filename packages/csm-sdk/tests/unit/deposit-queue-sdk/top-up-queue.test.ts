import { describe, expect, it, vi } from 'vitest';
import { DepositQueueSDK } from '../../../src/deposit-queue-sdk/deposit-queue-sdk';
import { buildOperatorQueueKeys } from '../../../src/deposit-queue-sdk/build-operator-queue-keys';
import { parseTopUpQueueItems } from '../../../src/deposit-queue-sdk/parse-top-up-queue-items';
import { TopUpQueueItem } from '../../../src/deposit-queue-sdk/types';

describe('parseTopUpQueueItems', () => {
  it('returns an empty array for empty input', () => {
    expect(parseTopUpQueueItems(0n, [])).toEqual([]);
  });

  it('assigns ascending positions starting at offset', () => {
    const items = parseTopUpQueueItems(5n, [
      { nodeOperatorId: 1n, keyIndex: 0n },
      { nodeOperatorId: 2n, keyIndex: 3n },
    ]);
    expect(items).toEqual([
      { position: 5, nodeOperatorId: 1n, keyIndex: 0 },
      { position: 6, nodeOperatorId: 2n, keyIndex: 3 },
    ]);
  });
});

describe('buildOperatorQueueKeys', () => {
  const items = (
    ...raw: [nodeOperatorId: bigint, keyIndex: number, position: number][]
  ): TopUpQueueItem[] =>
    raw.map(([nodeOperatorId, keyIndex, position]) => ({
      nodeOperatorId,
      keyIndex,
      position,
    }));

  it('drops candidates that belong to another operator', () => {
    const keys = buildOperatorQueueKeys(
      1n,
      ['0xaa', '0xbb'],
      items([2n, 0, 0], [1n, 1, 1]),
    );
    expect(keys).toEqual([{ pubkey: '0xbb', index: 1, position: 1 }]);
  });

  it('keeps both entries when one pubkey is queued at two key indices', () => {
    const keys = buildOperatorQueueKeys(
      1n,
      ['0xaa', '0xbb', '0xaa'],
      items([1n, 0, 3], [1n, 2, 7]),
    );
    expect(keys).toEqual([
      { pubkey: '0xaa', index: 0, position: 3 },
      { pubkey: '0xaa', index: 2, position: 7 },
    ]);
  });

  it('resolves the pubkey by key index, not by queue position', () => {
    const keys = buildOperatorQueueKeys(
      1n,
      ['0xaa', '0xbb'],
      items([1n, 1, 0]),
    );
    expect(keys).toEqual([{ pubkey: '0xbb', index: 1, position: 0 }]);
  });

  it('orders ascending by position, not by key index', () => {
    const keys = buildOperatorQueueKeys(
      1n,
      ['0xaa', '0xbb', '0xcc'],
      items([1n, 0, 5], [1n, 1, 1], [1n, 2, 3]),
    );
    expect(keys.map(({ position }) => position)).toEqual([1, 3, 5]);
  });

  it('skips a key index the operator no longer has', () => {
    expect(buildOperatorQueueKeys(1n, ['0xaa'], items([1n, 4, 0]))).toEqual([]);
  });
});

describe('DepositQueueSDK.getOperatorTopUpQueue', () => {
  const BLOCK = 123n;
  const LENGTH = 2500n;

  const makeSdk = () => {
    const getTopUpQueueItems = vi.fn(
      async (
        [, offset, limit]: readonly [bigint, bigint, bigint],
        _options?: { blockNumber: bigint },
      ) => {
        const end = offset + limit < LENGTH ? offset + limit : LENGTH;
        const items = [];
        for (let i = offset; i < end; i++) {
          items.push({ nodeOperatorId: 1n, keyIndex: i });
        }
        return [true, 10n, LENGTH, 0n, items] as const;
      },
    );
    const core = {
      moduleId: 3n,
      profile: { topUpQueue: true },
      publicClient: { getBlockNumber: vi.fn(async () => BLOCK) },
      getContract: () => ({ read: { getTopUpQueueItems } }),
    } as any;
    const bus = {
      operator: {
        getKeys: async () =>
          Array.from({ length: Number(LENGTH) }, (_, i) => `0x${i}`),
      },
    } as any;
    return { sdk: new DepositQueueSDK({ core, bus }), getTopUpQueueItems };
  };

  it('reads every page at the same block and concatenates them', async () => {
    const { sdk, getTopUpQueueItems } = makeSdk();

    const { total, keys } = await sdk.getOperatorTopUpQueue(1n);

    expect(total).toBe(2500);
    expect(getTopUpQueueItems).toHaveBeenCalledTimes(3);
    expect(getTopUpQueueItems.mock.calls.map(([args]) => args[1])).toEqual([
      0n,
      1000n,
      2000n,
    ]);
    for (const call of getTopUpQueueItems.mock.calls) {
      expect(call[1]).toEqual({ blockNumber: BLOCK });
    }
    expect(keys).toHaveLength(Number(LENGTH));
    expect(keys.every(({ index, position }) => index === position)).toBe(true);
  });
});

describe('DepositQueueSDK.getAllBatches', () => {
  const BLOCK = 321n;

  it('reads pointers, batches and depositable counts at one block', async () => {
    const depositQueuePointers = vi.fn(async (..._args: unknown[]) => [0n, 1n]);
    // packed batch: operator 0, 2 keys, nextBatchIndex 1 (== tail, ends the scan)
    const getDepositQueueBatches = vi.fn(async (..._args: unknown[]) => [
      (0n << 192n) | (2n << 128n) | 1n,
    ]);
    const getNodeOperatorsDepositableValidatorsCount = vi.fn(
      async (..._args: unknown[]) => [2],
    );
    const getOperatorsCount = vi.fn(async (..._args: unknown[]) => 1n);
    const core = {
      moduleId: 3n,
      publicClient: { getBlockNumber: vi.fn(async () => BLOCK) },
      getContract: () => ({
        read: {
          QUEUE_LOWEST_PRIORITY: async () => 0n,
          depositQueuePointers,
          getDepositQueueBatches,
          getNodeOperatorsDepositableValidatorsCount,
        },
      }),
    } as any;
    const bus = { module: { getOperatorsCount } } as any;
    const sdk = new DepositQueueSDK({ core, bus });

    const result = await sdk.getAllBatches();

    expect(result).toEqual([[{ nodeOperatorId: 0n, keysCount: 2 }]]);
    expect(core.publicClient.getBlockNumber).toHaveBeenCalledTimes(1);
    expect(getOperatorsCount).toHaveBeenCalledWith({ blockNumber: BLOCK });
    for (const fn of [
      depositQueuePointers,
      getDepositQueueBatches,
      getNodeOperatorsDepositableValidatorsCount,
    ]) {
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn.mock.calls[0]?.[1]).toEqual({ blockNumber: BLOCK });
    }
  });
});
