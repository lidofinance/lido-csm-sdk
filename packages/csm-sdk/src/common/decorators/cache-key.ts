import { isBigint } from '../utils/index';

export const IN_FLIGHT_TIMEOUT_MS = 60_000;

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

export const buildCacheKey = function <This>(
  instance: This,
  decoratorArgs?: string[],
  args: any[] = [],
) {
  const decoratorArgsKey = getDecoratorArgsString.call(instance, decoratorArgs);
  return `${decoratorArgsKey}:${serializeArgs(args)}`;
};

export const getOrCreate = <V>(
  store: WeakMap<object, V>,
  self: object,
  create: () => V,
): V => {
  let value = store.get(self);
  if (!value) store.set(self, (value = create()));
  return value;
};
