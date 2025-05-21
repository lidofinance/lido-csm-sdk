export class BusRegistry<
  TModules extends object = object,
  TNames extends keyof TModules = keyof TModules,
> {
  private sdks: Partial<TModules> = {};

  public register<T extends TNames>(sdk: TModules[T], name: T) {
    if (this.sdks[name]) {
      throw new Error(`Module ${name.toString()} already registered`);
    }
    this.sdks[name] = sdk;
  }

  public get<T extends TNames>(name: T): TModules[T] | undefined {
    return this.sdks[name];
  }
}
