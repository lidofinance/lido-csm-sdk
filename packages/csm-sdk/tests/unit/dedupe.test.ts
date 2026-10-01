import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IN_FLIGHT_TIMEOUT_MS } from '../../src/common/decorators/cache-key';
import { Dedupe } from '../../src/common/decorators/dedupe';

class TestService {
  impl = vi.fn<(arg?: number) => Promise<string>>();

  @Dedupe()
  async getValue(arg?: number): Promise<string> {
    return this.impl(arg);
  }
}

describe('Dedupe decorator', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();
  });

  it('shares one promise between concurrent calls', async () => {
    let resolvePromise: (v: string) => void;
    service.impl.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const p1 = service.getValue();
    const p2 = service.getValue();
    expect(p2).toBe(p1);

    resolvePromise!('shared');
    expect(await Promise.all([p1, p2])).toEqual(['shared', 'shared']);
    expect(service.impl).toHaveBeenCalledTimes(1);
  });

  it('re-executes after resolve', async () => {
    service.impl.mockResolvedValueOnce('a').mockResolvedValueOnce('b');

    expect(await service.getValue()).toBe('a');
    expect(await service.getValue()).toBe('b');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('re-executes after reject', async () => {
    service.impl
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    await expect(service.getValue()).rejects.toThrow('fail');
    expect(await service.getValue()).toBe('ok');
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('keys distinct args separately', async () => {
    service.impl.mockImplementation(async (arg) => `val-${arg}`);

    const [a, b] = await Promise.all([
      service.getValue(1),
      service.getValue(2),
    ]);

    expect([a, b]).toEqual(['val-1', 'val-2']);
    expect(service.impl).toHaveBeenCalledTimes(2);
  });

  it('re-executes when the in-flight call exceeds the timeout', async () => {
    vi.useFakeTimers();
    try {
      service.impl
        .mockReturnValueOnce(new Promise(() => {}))
        .mockResolvedValueOnce('fresh');

      void service.getValue();
      vi.advanceTimersByTime(IN_FLIGHT_TIMEOUT_MS + 1);

      expect(await service.getValue()).toBe('fresh');
      expect(service.impl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not share in-flight calls between instances', async () => {
    const other = new TestService();
    service.impl.mockResolvedValue('a');
    other.impl.mockResolvedValue('b');

    const [a, b] = await Promise.all([service.getValue(), other.getValue()]);

    expect([a, b]).toEqual(['a', 'b']);
  });

  it('rejects non-Promise methods at compile time', () => {
    class Bad {
      // @ts-expect-error sync method
      @Dedupe()
      sync() {
        return 1;
      }
    }
    expect(Bad).toBeDefined();
  });
});
