import { ERROR_CODE, invariant } from '@lidofinance/lido-ethereum-sdk';

export type BusWithModules<
  TModules extends object = object,
  TNames extends keyof TModules = keyof TModules,
> = BusRegistry<TModules, TNames> & TModules;

export class BusRegistry<
  TModules extends object = object,
  TNames extends keyof TModules = keyof TModules,
> {
  private sdks: Partial<TModules> = {};

  constructor() {
    // Return Proxy to enable direct property access to registered modules
    return new Proxy(this, {
      get(target, prop, receiver) {
        // First, check if property exists on BusRegistry instance (methods, etc)
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        // Then try to resolve from registered modules
        const module = target.sdks[prop as TNames];
        if (module !== undefined) {
          return module;
        }

        // Default behavior for undefined properties
        return Reflect.get(target, prop, receiver);
      },
    }) as unknown as BusWithModules<TModules, TNames>;
  }

  public register<T extends TNames>(sdk: TModules[T], name: T) {
    if (this.sdks[name]) {
      throw new Error(`Module ${name.toString()} already registered`);
    }
    this.sdks[name] = sdk;
  }

  public get<T extends TNames>(name: T): TModules[T] | undefined {
    return this.sdks[name];
  }

  public getOrThrow<T extends TNames>(name: T): TModules[T] {
    invariant(
      this.sdks[name],
      `Module ${name.toString()} not registered`,
      ERROR_CODE.UNKNOWN_ERROR,
    );
    return this.sdks[name];
  }
}
