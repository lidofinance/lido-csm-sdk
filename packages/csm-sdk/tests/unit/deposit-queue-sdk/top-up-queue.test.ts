import { Hex } from 'viem';
import { describe, expect, it } from 'vitest';
import { buildTopUpPositions } from '../../../src/deposit-queue-sdk/build-top-up-positions';
import { selectOperatorQueueKeys } from '../../../src/deposit-queue-sdk/select-operator-queue-keys';

describe('buildTopUpPositions', () => {
  it('returns an empty map for an empty queue', () => {
    expect(buildTopUpPositions([])).toEqual(new Map());
  });

  it('assigns positions 0..n-1 in order', () => {
    const pubkeys: Hex[] = ['0xaa', '0xbb', '0xcc'];
    expect(buildTopUpPositions(pubkeys)).toEqual(
      new Map([
        ['0xaa', 0],
        ['0xbb', 1],
        ['0xcc', 2],
      ]),
    );
  });

  it('keeps the first (lowest) position on a duplicate pubkey', () => {
    const pubkeys: Hex[] = ['0xaa', '0xbb', '0xaa'];
    expect(buildTopUpPositions(pubkeys)).toEqual(
      new Map([
        ['0xaa', 0],
        ['0xbb', 1],
      ]),
    );
  });

  it('normalizes mixed casing to match', () => {
    const pubkeys: Hex[] = ['0xAABB'];
    expect(buildTopUpPositions(pubkeys)).toEqual(new Map([['0xaabb', 0]]));
  });
});

describe('selectOperatorQueueKeys', () => {
  it('returns an empty array when the operator has no queued keys', () => {
    const positions = new Map<Hex, number>([['0xaa', 0]]);
    expect(selectOperatorQueueKeys(['0xbb'], positions)).toEqual([]);
  });

  it('orders the result ascending by position, not by index', () => {
    const operatorKeys: Hex[] = ['0xaa', '0xbb', '0xcc'];
    const positions = new Map<Hex, number>([
      ['0xaa', 5],
      ['0xbb', 1],
      ['0xcc', 3],
    ]);
    expect(selectOperatorQueueKeys(operatorKeys, positions)).toEqual([
      { pubkey: '0xbb', index: 1, position: 1 },
      { pubkey: '0xcc', index: 2, position: 3 },
      { pubkey: '0xaa', index: 0, position: 5 },
    ]);
  });

  it('sets index to the operator-local key index, not the queue position', () => {
    const operatorKeys: Hex[] = ['0xaa', '0xbb'];
    const positions = new Map<Hex, number>([['0xbb', 10]]);
    expect(selectOperatorQueueKeys(operatorKeys, positions)).toEqual([
      { pubkey: '0xbb', index: 1, position: 10 },
    ]);
  });

  it('omits a key present in the operator list but absent from the queue', () => {
    const operatorKeys: Hex[] = ['0xaa', '0xbb'];
    const positions = new Map<Hex, number>([['0xaa', 0]]);
    expect(selectOperatorQueueKeys(operatorKeys, positions)).toEqual([
      { pubkey: '0xaa', index: 0, position: 0 },
    ]);
  });
});
