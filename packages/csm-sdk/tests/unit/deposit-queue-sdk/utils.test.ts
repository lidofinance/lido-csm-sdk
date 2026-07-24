import { describe, it, expect } from 'vitest';
import { parseBatch } from '../../../src/deposit-queue-sdk/parse-batch';
import { filterEmptyBatches } from '../../../src/deposit-queue-sdk/filter-batches';
import { byNextBatchIndex } from '../../../src/deposit-queue-sdk/next-batch-index';

describe('parseBatch', () => {
  it('decodes a packed bigint into batch fields', () => {
    // Pack: nodeOperatorId=5 at bits 192+, keysCount=3 at bits 128-191, nextBatchIndex=42 at bits 0-127
    const packed = (5n << 192n) | (3n << 128n) | 42n;
    const result = parseBatch(packed);

    expect(result.nodeOperatorId).toBe(5n);
    expect(result.keysCount).toBe(3);
    expect(result.nextBatchIndex).toBe(42n);
  });

  it('handles zero values', () => {
    const result = parseBatch(0n);
    expect(result.nodeOperatorId).toBe(0n);
    expect(result.keysCount).toBe(0);
    expect(result.nextBatchIndex).toBe(0n);
  });

  it('handles large nodeOperatorId', () => {
    const id = 999n;
    const packed = (id << 192n) | (10n << 128n) | 1n;
    const result = parseBatch(packed);
    expect(result.nodeOperatorId).toBe(999n);
    expect(result.keysCount).toBe(10);
    expect(result.nextBatchIndex).toBe(1n);
  });
});

describe('filterEmptyBatches', () => {
  it('filters batches exceeding depositable keys', () => {
    const batches = [
      [
        { nodeOperatorId: 0n, keysCount: 5 },
        { nodeOperatorId: 1n, keysCount: 3 },
      ],
    ];
    // operator 0 has 2 depositable keys, operator 1 has 10
    const result = filterEmptyBatches(batches, [2, 10]);

    expect(result).toEqual([
      [
        { nodeOperatorId: 0n, keysCount: 2 },
        { nodeOperatorId: 1n, keysCount: 3 },
      ],
    ]);
  });

  it('removes batches with zero remaining keys', () => {
    const batches = [[{ nodeOperatorId: 0n, keysCount: 5 }]];
    const result = filterEmptyBatches(batches, [0]);
    expect(result).toEqual([[]]);
  });

  it('tracks remaining keys across multiple batches for same operator', () => {
    const batches = [
      [
        { nodeOperatorId: 0n, keysCount: 3 },
        { nodeOperatorId: 0n, keysCount: 3 },
      ],
    ];
    // operator 0 has 4 depositable keys total
    const result = filterEmptyBatches(batches, [4]);
    expect(result).toEqual([
      [
        { nodeOperatorId: 0n, keysCount: 3 },
        { nodeOperatorId: 0n, keysCount: 1 },
      ],
    ]);
  });

  it('handles multiple queues', () => {
    const batches = [
      [{ nodeOperatorId: 0n, keysCount: 2 }],
      [{ nodeOperatorId: 0n, keysCount: 2 }],
    ];
    // operator 0 has 3 depositable keys shared across queues
    const result = filterEmptyBatches(batches, [3]);
    expect(result).toEqual([
      [{ nodeOperatorId: 0n, keysCount: 2 }],
      [{ nodeOperatorId: 0n, keysCount: 1 }],
    ]);
  });

  it('handles empty input', () => {
    expect(filterEmptyBatches([], [])).toEqual([]);
    expect(filterEmptyBatches([[]], [0])).toEqual([[]]);
  });
});

describe('byNextBatchIndex', () => {
  it('returns next index when within tail', () => {
    const cursor = byNextBatchIndex(100n);
    const result = cursor({
      items: [{ nextBatchIndex: 50n }],
      offset: 0n,
      limit: 10n,
    });
    expect(result).toBe(50n);
  });

  it('returns undefined when next index equals tail', () => {
    const cursor = byNextBatchIndex(100n);
    const result = cursor({
      items: [{ nextBatchIndex: 100n }],
      offset: 0n,
      limit: 10n,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined when next index exceeds tail', () => {
    const cursor = byNextBatchIndex(100n);
    const result = cursor({
      items: [{ nextBatchIndex: 200n }],
      offset: 0n,
      limit: 10n,
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty items', () => {
    const cursor = byNextBatchIndex(100n);
    const result = cursor({ items: [], offset: 0n, limit: 10n });
    expect(result).toBeUndefined();
  });

  it('uses last item for next index', () => {
    const cursor = byNextBatchIndex(100n);
    const result = cursor({
      items: [{ nextBatchIndex: 10n }, { nextBatchIndex: 50n }],
      offset: 0n,
      limit: 10n,
    });
    expect(result).toBe(50n);
  });
});
