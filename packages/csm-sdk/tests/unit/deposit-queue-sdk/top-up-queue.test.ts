import { Hex } from 'viem';
import { describe, expect, it } from 'vitest';
import { buildOperatorQueueKeys } from '../../../src/deposit-queue-sdk/build-operator-queue-keys';
import { selectQueueCandidates } from '../../../src/deposit-queue-sdk/select-queue-candidates';
import {
  TopUpQueueEntry,
  TopUpQueueItem,
} from '../../../src/deposit-queue-sdk/types';

const entries = (...pubkeys: Hex[]): TopUpQueueEntry[] =>
  pubkeys.map((pubkey, position) => ({ pubkey, position }));

describe('selectQueueCandidates', () => {
  it('returns an empty array when the operator owns no queued pubkey', () => {
    expect(selectQueueCandidates(['0xbb'], entries('0xaa'))).toEqual([]);
  });

  it('returns the positions of every matching pubkey', () => {
    expect(
      selectQueueCandidates(['0xaa', '0xcc'], entries('0xaa', '0xbb', '0xcc')),
    ).toEqual([0, 2]);
  });

  it('keeps every position of a repeated pubkey', () => {
    expect(
      selectQueueCandidates(['0xaa'], entries('0xaa', '0xbb', '0xaa')),
    ).toEqual([0, 2]);
  });

  it('normalizes mixed casing on both sides', () => {
    expect(selectQueueCandidates(['0xAAbb'], entries('0xaaBB'))).toEqual([0]);
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
