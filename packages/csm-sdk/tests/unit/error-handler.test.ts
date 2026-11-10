import { describe, expect, it, vi } from 'vitest';
import { ErrorHandler } from '../../src/common/decorators/error-handler';
import { SDKError } from '../../src/common/index';
import { TransactionCallbackStage } from '../../src/tx-sdk/types';

class Service {
  @ErrorHandler()
  async notifying(_props: { callback?: (a: unknown) => void }) {
    throw new Error('boom');
  }

  @ErrorHandler('Error:', { notify: false })
  async silent(_props: { callback?: (a: unknown) => void }) {
    throw new Error('boom');
  }
}

describe('ErrorHandler notify option', () => {
  it('fires the ERROR callback by default', async () => {
    const callback = vi.fn();
    await expect(new Service().notifying({ callback })).rejects.toBeInstanceOf(
      SDKError,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ stage: TransactionCallbackStage.ERROR }),
    );
  });

  it('skips the callback with notify: false but still wraps the error', async () => {
    const callback = vi.fn();
    await expect(new Service().silent({ callback })).rejects.toBeInstanceOf(
      SDKError,
    );
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('ErrorHandler console logging', () => {
  class Nested {
    core = { logMode: 'debug' };

    @ErrorHandler()
    async inner() {
      throw new Error('boom');
    }

    @ErrorHandler()
    async outer() {
      return this.inner();
    }

    @ErrorHandler()
    get failingGetter(): number {
      throw new Error('boom');
    }
  }

  const errorLines = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.filter((args: unknown[]) =>
      String(args[0]).includes('Error:'),
    );

  it('prints one console line for nested handlers and still rethrows the same SDKError', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const service = new Nested();
    const outerError = await service.outer().catch((e) => e);
    expect(outerError).toBeInstanceOf(SDKError);
    expect(errorLines(spy)).toHaveLength(1);
    expect(errorLines(spy)[0]?.[2]).toContain("'inner'");
    spy.mockRestore();
  });

  it('prints once for a getter error', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(() => new Nested().failingGetter).toThrow(SDKError);
    expect(errorLines(spy)).toHaveLength(1);
    spy.mockRestore();
  });
});
