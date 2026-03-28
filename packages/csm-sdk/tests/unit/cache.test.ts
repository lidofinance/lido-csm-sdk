import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CsmSDKCacheable } from '../../src/common/class-primitives/csm-sdk-cacheable.js';
import { Cache } from '../../src/common/decorators/cache.js';

const TTL = 10_000;

class TestService extends CsmSDKCacheable {
  private _cacheVersion = 0;

  get cacheVersion() {
    return this._cacheVersion;
  }

  invalidateCache() {
    this._cacheVersion++;
  }

  impl = vi.fn<(arg?: number) => Promise<string>>();
  syncImpl = vi.fn<(arg?: number) => string>();
  getterImpl = vi.fn<() => Promise<number>>();

  @Cache(TTL)
  async getValue(arg?: number): Promise<string> {
    return this.impl(arg);
  }

  @Cache(TTL)
  getSyncValue(arg?: number): string {
    return this.syncImpl(arg);
  }

  @Cache(TTL)
  get computed(): Promise<number> {
    return this.getterImpl();
  }
}

describe('Cache decorator', () => {
  let service: TestService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new TestService();
    service.impl.mockResolvedValue('result');
    service.syncImpl.mockReturnValue('sync-result');
    service.getterImpl.mockResolvedValue(42);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns cached value within TTL', async () => {
    const first = await service.getValue();
    const second = await service.getValue();

    expect(first).toBe('result');
    expect(second).toBe('result');
    expect(service.impl).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after TTL expires', async () => {
    service.impl.mockResolvedValueOnce('old').mockResolvedValueOnce('new');

    const first = await service.getValue();
    vi.advanceTimersByTime(TTL + 1);
    const second = await service.getValue();

    expect(first).toBe('old');
    expect(second).toBe('new');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('re-fetches after cache invalidation within TTL', async () => {
    service.impl.mockResolvedValueOnce('old').mockResolvedValueOnce('new');

    const first = await service.getValue();
    service.invalidateCache();
    const second = await service.getValue();

    expect(first).toBe('old');
    expect(second).toBe('new');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('caches different args independently', async () => {
    service.impl.mockImplementation(async (arg) => `val-${arg}`);

    const a = await service.getValue(1);
    const b = await service.getValue(2);
    const a2 = await service.getValue(1);

    expect(a).toBe('val-1');
    expect(b).toBe('val-2');
    expect(a2).toBe('val-1');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent async calls', async () => {
    let resolvePromise: (v: string) => void;
    service.impl.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const p1 = service.getValue();
    const p2 = service.getValue();

    resolvePromise!('deduped');
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe('deduped');
    expect(r2).toBe('deduped');
    expect(service.impl).toHaveBeenCalledTimes(1);
  });

  it('in-flight promise does not survive version-based invalidation', async () => {
    let resolveFirst: (v: string) => void;
    let resolveSecond: (v: string) => void;
    service.impl
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );

    const p1 = service.getValue();
    service.invalidateCache();
    const p2 = service.getValue();

    resolveFirst!('first');
    resolveSecond!('second');
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe('first');
    expect(r2).toBe('second');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('does not cache rejected promises', async () => {
    service.impl
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('recovered');

    await expect(service.getValue()).rejects.toThrow('fail');
    const result = await service.getValue();

    expect(result).toBe('recovered');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('works with sync methods', () => {
    service.syncImpl.mockReturnValue('a');

    const first = service.getSyncValue();
    const second = service.getSyncValue();

    expect(first).toBe('a');
    expect(second).toBe('a');
    expect(service.syncImpl).toHaveBeenCalledTimes(1);
  });

  it('invalidation works with sync methods', () => {
    service.syncImpl.mockReturnValueOnce('old').mockReturnValueOnce('new');

    const first = service.getSyncValue();
    service.invalidateCache();
    const second = service.getSyncValue();

    expect(first).toBe('old');
    expect(second).toBe('new');
    expect(service.syncImpl).toHaveBeenCalledTimes(2);
  });

  it('works with getters', async () => {
    const first = await service.computed;
    const second = await service.computed;

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(service.getterImpl).toHaveBeenCalledTimes(1);
  });

  it('invalidation works with getters', async () => {
    service.getterImpl.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    const first = await service.computed;
    service.invalidateCache();
    const second = await service.computed;

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(service.getterImpl).toHaveBeenCalledTimes(2);
  });
});
