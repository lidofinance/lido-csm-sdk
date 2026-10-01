import { buildCacheKey, getOrCreate, IN_FLIGHT_TIMEOUT_MS } from './cache-key';
import { callConsoleMessage } from './utils';

type DedupeEntry = { promise: Promise<any>; startedAt: number };

export const Dedupe = function (cacheArgs?: string[]) {
  return function DedupeDecorator<This extends object>(
    target: (this: This, ...args: any[]) => Promise<any>,
    context: ClassMethodDecoratorContext<This, any>,
  ) {
    const methodName = String(context.name);
    const store = new WeakMap<object, Map<string, DedupeEntry>>();

    return function replacementMethod(this: This, ...args: any[]) {
      const entries = getOrCreate(store, this, () => new Map());
      const cacheKey = buildCacheKey(this, cacheArgs, args);
      const inFlight = entries.get(cacheKey);
      if (inFlight && Date.now() - inFlight.startedAt <= IN_FLIGHT_TIMEOUT_MS) {
        callConsoleMessage.call(
          this,
          'Cache:',
          `Sharing in-flight call for '${methodName}'.`,
        );
        return inFlight.promise;
      }

      const promise = target.call(this, ...args);
      const entry = { promise, startedAt: Date.now() };
      entries.set(cacheKey, entry);
      const release = () => {
        if (entries.get(cacheKey) === entry) entries.delete(cacheKey);
      };
      // eslint-disable-next-line promise/catch-or-return -- release handles both outcomes
      promise.then(release, release);
      return promise;
    };
  };
};
