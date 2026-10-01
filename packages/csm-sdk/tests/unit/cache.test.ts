import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cache, cacheSize } from '../../src/common/decorators/cache';
import { IN_FLIGHT_TIMEOUT_MS } from '../../src/common/decorators/cache-key';

const TTL = 10_000;

class TestService {
  impl = vi.fn<(arg?: number) => Promise<string>>();
  otherImpl = vi.fn<(arg?: number) => Promise<string>>();
  syncImpl = vi.fn<(arg?: number) => string>();
  getterImpl = vi.fn<() => Promise<number>>();

  @Cache(TTL)
  async getValue(arg?: number): Promise<string> {
    return this.impl(arg);
  }

  @Cache(Infinity)
  async getImmutable(arg?: number): Promise<string> {
    return this.impl(arg);
  }

  @Cache(TTL)
  getSyncValue(arg?: number): string {
    return this.syncImpl(arg);
  }

  @Cache(TTL)
  async getOther(arg?: number): Promise<string> {
    return this.otherImpl(arg);
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

  it('never expires immutable entries', async () => {
    await service.getImmutable();
    vi.advanceTimersByTime(365 * 24 * 3600 * 1000);
    await service.getImmutable();

    expect(service.impl).toHaveBeenCalledTimes(1);
  });

  it('re-executes when an in-flight entry exceeds the in-flight timeout', async () => {
    service.impl.mockReturnValueOnce(new Promise(() => {}));
    service.impl.mockResolvedValueOnce('second');

    void service.getValue();
    vi.advanceTimersByTime(IN_FLIGHT_TIMEOUT_MS + 1);

    expect(await service.getValue()).toBe('second');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('late settle does not clobber a newer entry', async () => {
    let resolveFirst: (v: string) => void;
    service.impl
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce('second');

    const p1 = service.getValue();
    vi.advanceTimersByTime(IN_FLIGHT_TIMEOUT_MS + 1);
    const p2 = service.getValue();
    expect(await p2).toBe('second');

    resolveFirst!('first');
    expect(await p1).toBe('first');

    expect(await service.getValue()).toBe('second');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('late rejection does not delete a newer entry', async () => {
    let rejectFirst: (e: Error) => void;
    service.impl
      .mockReturnValueOnce(
        new Promise((_resolve, reject) => {
          rejectFirst = reject;
        }),
      )
      .mockResolvedValueOnce('second');

    const p1 = service.getValue();
    vi.advanceTimersByTime(IN_FLIGHT_TIMEOUT_MS + 1);
    await service.getValue();

    rejectFirst!(new Error('late'));
    await expect(p1).rejects.toThrow('late');

    expect(await service.getValue()).toBe('second');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('prunes expired settled entries on write', async () => {
    await service.getValue(1);
    await service.getValue(2);
    expect(cacheSize(service, service.getValue)).toBe(2);

    vi.advanceTimersByTime(TTL + 1);
    await service.getValue(3);

    expect(cacheSize(service, service.getValue)).toBe(1);
  });

  it('never prunes immutable or in-flight entries', async () => {
    await service.getImmutable();
    service.impl.mockReturnValueOnce(new Promise(() => {}));
    void service.getValue(1);

    vi.advanceTimersByTime(IN_FLIGHT_TIMEOUT_MS + 1);
    await service.getValue(2);

    expect(cacheSize(service, service.getImmutable)).toBe(1);
    expect(cacheSize(service, service.getValue)).toBe(2);
  });

  it('does not share entries between instances', async () => {
    const other = new TestService();
    other.impl.mockResolvedValue('other-result');

    expect(await service.getValue()).toBe('result');
    expect(await other.getValue()).toBe('other-result');
    expect(service.impl).toHaveBeenCalledTimes(1);
    expect(other.impl).toHaveBeenCalledTimes(1);
  });

  it('does not collide across methods with identical args', async () => {
    service.otherImpl.mockResolvedValue('other');

    expect(await service.getValue(1)).toBe('result');
    expect(await service.getOther(1)).toBe('other');
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

  it('works with getters', async () => {
    const first = await service.computed;
    const second = await service.computed;

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(service.getterImpl).toHaveBeenCalledTimes(1);
  });

  it('returns a thenable on a cache hit for async methods', async () => {
    await service.getValue();
    const second = service.getValue();

    expect(second).toBeInstanceOf(Promise);
    expect(typeof second.catch).toBe('function');
    expect(await second).toBe('result');
  });

  it('returns a thenable on a cache hit for async getters', async () => {
    await service.computed;
    const second = service.computed;

    expect(second).toBeInstanceOf(Promise);
    expect(typeof second.catch).toBe('function');
    expect(await second).toBe(42);
  });

  it('keeps returning the raw value on a cache hit for sync methods', () => {
    service.getSyncValue();
    const second = service.getSyncValue();

    expect(second).not.toBeInstanceOf(Promise);
    expect(second).toBe('sync-result');
  });
});
