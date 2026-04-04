import { CoreSDK } from '../../core-sdk/core-sdk.js';
import { ACCESS } from '../decorators/access.js';
import type {
  MethodAccess,
  PublicMethods,
} from '../decorators/access-types.js';
import { BusRegistry, BusWithModules } from './bus-registry.js';
import { CsmSDKCacheable } from './csm-sdk-cacheable.js';

export type CsmSDKProps = {
  core: CoreSDK;
  bus?: BusRegistry;
};

export abstract class CsmSDKModule<
  TBus extends object = object,
> extends CsmSDKCacheable {
  readonly core: CoreSDK;
  readonly bus: BusWithModules<TBus>;

  get cacheVersion() {
    return this.core.cacheVersion;
  }

  constructor(props: CsmSDKProps, name?: string) {
    super();

    this.core = props.core;

    this.bus = (props.bus ?? new BusRegistry<TBus>()) as BusWithModules<TBus>;

    if (name) {
      this.bus.register(this as TBus[keyof TBus], name as keyof TBus);
    }
  }

  getMethodAccess<K extends string & PublicMethods<this>>(
    method: K,
  ): MethodAccess | undefined {
    const fn = (this as any)[method];
    return typeof fn === 'function' ? fn[ACCESS] : undefined;
  }

  getAccessMap(): Record<string, MethodAccess> {
    const proto = Object.getPrototypeOf(this) as Record<string, unknown>;
    const result: Record<string, MethodAccess> = {};
    for (const name of Object.getOwnPropertyNames(proto)) {
      const fn = proto[name];
      if (typeof fn === 'function' && ACCESS in fn) {
        result[name] = (fn as any)[ACCESS] as MethodAccess;
      }
    }
    return result;
  }
}
