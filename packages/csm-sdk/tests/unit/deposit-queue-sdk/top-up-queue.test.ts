import { describe, expect, it } from 'vitest';
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
