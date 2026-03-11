import { describe, it, expect } from 'vitest';
import { bigIntRange } from '../../../src/common/utils/bigint-range.js';

describe('bigIntRange', () => {
  it('yields 0n to count-1n', () => {
    expect([...bigIntRange(4n)]).toEqual([0n, 1n, 2n, 3n]);
  });

  it('yields single element for count=1n', () => {
    expect([...bigIntRange(1n)]).toEqual([0n]);
  });

  it('yields nothing for count=0n', () => {
    expect([...bigIntRange(0n)]).toEqual([]);
  });
});
