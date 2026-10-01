import { buildCacheKey, getOrCreate, IN_FLIGHT_TIMEOUT_MS } from './cache-key';
import { callConsoleMessage } from './utils';

type CacheEntry = {
  data: any;
  timestamp: number;
  ttl: number;
  async?: boolean;
};

type Store = WeakMap<object, Map<string, CacheEntry>>;

const storeByReplacement = new WeakMap<object, Store>();

/** Test hook: entry count for `instance` in the store behind decorated `fn`. */
export const cacheSize = (instance: object, fn: object) =>
  storeByReplacement.get(fn)?.get(instance)?.size ?? 0;

const isInFlight = (entry: CacheEntry) => entry.data instanceof Promise;

const isEntryValid = (entry: CacheEntry, now: number) =>
  isInFlight(entry)
    ? now - entry.timestamp <= IN_FLIGHT_TIMEOUT_MS
    : now - entry.timestamp <= entry.ttl;

const pruneExpired = (cache: Map<string, CacheEntry>, now: number) => {
  for (const [key, entry] of cache) {
    if (isInFlight(entry) || entry.ttl === Infinity) continue;
    if (!isEntryValid(entry, now)) cache.delete(key);
  }
};

export const Cache = function (timeMs = 0, cacheArgs?: string[]) {
  return function CacheDecorator<This extends object, Value>(
    target:
      | (This extends object ? This[keyof This] : never)
      | ((this: This, ...args: any[]) => Value),
    context:
      | ClassMethodDecoratorContext<This, any>
      | ClassGetterDecoratorContext<This, Value>,
  ) {
    const methodName = String(context.name);
    const kind = context.kind;
    const store: Store = new WeakMap();

    const resolveCache = function (
      instance: This,
      cache: Map<string, CacheEntry>,
      cacheKey: string,
      execute: () => any,
    ): any {
      const cachedEntry = cache.get(cacheKey);
      if (cachedEntry) {
        if (isEntryValid(cachedEntry, Date.now())) {
          callConsoleMessage.call(
            instance,
            'Cache:',
            `Using cache for ${kind} '${methodName}'.`,
          );
          // re-wrap async results: a settled entry's `data` is the resolved value, not a Promise
          return cachedEntry.async
            ? Promise.resolve(cachedEntry.data)
            : cachedEntry.data;
        }
        callConsoleMessage.call(
          instance,
          'Cache:',
          `Cache for ${kind} '${methodName}' has expired.`,
        );
        cache.delete(cacheKey);
      }

      callConsoleMessage.call(
        instance,
        'Cache:',
        `Cache for ${kind} '${methodName}' set.`,
      );
      const result = execute();
      const write = (entry: CacheEntry) => {
        pruneExpired(cache, entry.timestamp);
        cache.set(cacheKey, entry);
        return entry;
      };

      if (!(result instanceof Promise)) {
        write({ data: result, timestamp: Date.now(), ttl: timeMs });
        return result;
      }

      const wrapped: Promise<unknown> = result
        .then((resolvedResult) => {
          if (cache.get(cacheKey) === pending) {
            write({
              data: resolvedResult,
              timestamp: Date.now(),
              ttl: timeMs,
              async: true,
            });
          }
          return resolvedResult;
        })
        .catch((error) => {
          if (cache.get(cacheKey) === pending) cache.delete(cacheKey);
          throw error;
        });
      const pending = write({
        data: wrapped,
        timestamp: Date.now(),
        ttl: timeMs,
        async: true,
      });
      return wrapped;
    };

    const entriesOf = (self: object) =>
      getOrCreate(store, self, () => new Map<string, CacheEntry>());

    if (kind === 'getter') {
      const replacementGetter = function (this: This): Value {
        const cacheKey = buildCacheKey(this, cacheArgs);
        return resolveCache(this, entriesOf(this), cacheKey, () =>
          (target as () => Value).call(this),
        );
      };

      storeByReplacement.set(replacementGetter, store);
      return replacementGetter as any;
    }

    const replacementMethod = function (this: This, ...args: any[]): any {
      const cacheKey = buildCacheKey(this, cacheArgs, args);
      return resolveCache(this, entriesOf(this), cacheKey, () =>
        (target as (...args: any[]) => any).call(this, ...args),
      );
    };
    storeByReplacement.set(replacementMethod, store);
    return replacementMethod;
  };
};
