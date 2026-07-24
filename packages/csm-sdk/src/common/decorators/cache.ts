import { CsmSDKCacheable } from '../class-primitives/csm-sdk-cacheable';
import { isBigint } from '../utils/index';
import { callConsoleMessage } from './utils';

const serializeArgs = (args: any[]) =>
  args
    .map((arg: any) =>
      JSON.stringify(arg, (_key, value) => {
        return isBigint(value) ? value.toString() : value;
      }),
    )
    .join(':');

const getDecoratorArgsString = function <This>(this: This, args?: string[]) {
  if (!args) return '';

  const argsStringArr = args.map((arg) => {
    const field = arg
      .split('.')
      .reduce((a, b) => (a as { [key: string]: any })[b], this);

    return arg && typeof field === 'function' ? field.call(this) : field;
  });

  return serializeArgs(argsStringArr);
};

const IN_FLIGHT_TIMEOUT_MS = 60_000;

export const Cache = function (timeMs = 0, cacheArgs?: string[]) {
  return function CacheDecorator<This extends CsmSDKCacheable, Value>(
    target:
      | (This extends object ? This[keyof This] : never)
      | ((this: This, ...args: any[]) => Value),
    context:
      | ClassMethodDecoratorContext<This, any>
      | ClassGetterDecoratorContext<This, Value>,
  ) {
    const methodName = String(context.name);
    const kind = context.kind;

    const isImmutable = timeMs === Infinity;

    const resolveCache = function (
      instance: This,
      cache: Map<string, { data: any; timestamp: number; version?: number }>,
      cacheKey: string,
      execute: () => any,
    ): any {
      const isEntryValid = (
        entry: { data: any; timestamp: number; version?: number },
        now: number,
      ) =>
        (isImmutable || entry.version === instance.cacheVersion) &&
        (entry.data instanceof Promise
          ? now - entry.timestamp <= IN_FLIGHT_TIMEOUT_MS
          : isImmutable || now - entry.timestamp <= timeMs);

      if (cache.has(cacheKey)) {
        const cachedEntry = cache.get(cacheKey);
        if (cachedEntry && isEntryValid(cachedEntry, Date.now())) {
          callConsoleMessage.call(
            instance,
            'Cache:',
            `Using cache for ${kind} '${methodName}'.`,
          );
          return cachedEntry.data;
        } else {
          callConsoleMessage.call(
            instance,
            'Cache:',
            `Cache for ${kind} '${methodName}' has expired.`,
          );
          cache.delete(cacheKey);
        }
      }

      callConsoleMessage.call(
        instance,
        'Cache:',
        `Cache for ${kind} '${methodName}' set.`,
      );
      const callVersion = isImmutable ? undefined : instance.cacheVersion;
      const result = execute();
      if (result instanceof Promise) {
        const wrapped = result
          .then((resolvedResult) => {
            if (isImmutable || cache.get(cacheKey)?.version === callVersion) {
              cache.set(cacheKey, {
                data: resolvedResult,
                timestamp: Date.now(),
                version: callVersion,
              });
            }
            return resolvedResult;
          })
          .catch((error) => {
            if (isImmutable || cache.get(cacheKey)?.version === callVersion) {
              cache.delete(cacheKey);
            }
            throw error;
          });
        cache.set(cacheKey, {
          data: wrapped,
          timestamp: Date.now(),
          version: callVersion,
        });
        return wrapped;
      } else {
        cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          version: callVersion,
        });
      }

      return result;
    };

    if (kind === 'getter') {
      const replacementGetter = function (this: This): Value {
        const decoratorArgsKey = getDecoratorArgsString.call(this, cacheArgs);
        const cacheKey = `${methodName}:${decoratorArgsKey}:`;
        return resolveCache(this, this.cache, cacheKey, () =>
          (target as () => Value).call(this),
        );
      };

      return replacementGetter as any;
    }

    const replacementMethod = function (this: This, ...args: any[]): any {
      const decoratorArgsKey = getDecoratorArgsString.call(this, cacheArgs);
      const argsKey = serializeArgs(args);
      const cacheKey = `${methodName}:${decoratorArgsKey}:${argsKey}`;
      return resolveCache(this, this.cache, cacheKey, () =>
        (target as (...args: any[]) => any).call(this, ...args),
      );
    };
    return replacementMethod;
  };
};
