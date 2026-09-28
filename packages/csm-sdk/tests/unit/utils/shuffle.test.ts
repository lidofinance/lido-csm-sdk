import { afterEach, describe, expect, it, vi } from 'vitest';
import { shuffle } from '../../../src/common/utils/shuffle';

describe('shuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not mutate the input array', () => {
    const items = [1, 2, 3];
    const copy = [...items];
    shuffle(items);
    expect(items).toEqual(copy);
  });

  it('returns a copy for a single-element array', () => {
    const items = [1];
    const result = shuffle(items);
    expect(result).toEqual([1]);
    expect(result).not.toBe(items);
  });

  it('produces a deterministic order when Math.random is mocked', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0);
    expect(shuffle([1, 2, 3])).toEqual([2, 3, 1]);
  });
});
