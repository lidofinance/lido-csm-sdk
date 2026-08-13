import { describe, it, expect, vi } from 'vitest';
import { pooledMap } from '../../../src/common/utils/pooled-map';

describe('pooledMap', () => {
  it('preserves input order regardless of completion order', async () => {
    const result = await pooledMap([1, 2, 3, 4], 2, async (n) => {
      await new Promise((resolve) => setTimeout(resolve, (4 - n) * 5));
      return n * 10;
    });
    expect(result).toEqual([10, 20, 30, 40]);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    await pooledMap(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async (n) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        return n;
      },
    );
    expect(peak).toBe(4);
  });

  it('returns an empty array for empty input without calling fn', async () => {
    const fn = vi.fn();
    expect(await pooledMap([], 4, fn)).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });

  it('rejects with the first error', async () => {
    await expect(
      pooledMap([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
  });

  it('stops scheduling new work after a failure', async () => {
    const started: number[] = [];
    // Item 1 fails on the first microtask turn while every survivor is parked
    // on a real timer, so the failure is guaranteed to land before the pool
    // can drain. Gating the *failing* item instead would prove nothing: the
    // other worker would race through items 2-6 on the microtask queue long
    // before any timer callback ran.
    await expect(
      pooledMap([1, 2, 3, 4, 5, 6], 2, async (n) => {
        started.push(n);
        if (n === 1) throw new Error('boom');
        await new Promise((resolve) => setTimeout(resolve, 20));
        return n;
      }),
    ).rejects.toThrow('boom');

    // Both workers start synchronously; item 1 then fails, so no slot is
    // ever refilled.
    expect(started).toEqual([1, 2]);
  });

  it('rejects a non-positive limit', async () => {
    await expect(pooledMap([1], 0, async (n) => n)).rejects.toThrow();
  });
});
