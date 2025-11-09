import { CoreSDK } from '../../core-sdk/core-sdk.js';
import { BusRegistry } from './bus-registry.js';
import { CsmSDKCacheable } from './csm-sdk-cacheable.js';

export type CsmSDKProps = {
  core: CoreSDK;
  bus?: BusRegistry;
};

export abstract class CsmSDKModule<
  TBus extends object = object,
> extends CsmSDKCacheable {
  readonly core: CoreSDK;
  readonly bus: BusRegistry<TBus>;

  constructor(props: CsmSDKProps, name?: string) {
    super();

    this.core = props.core;

    this.bus = props.bus ?? new BusRegistry();

    if (name) {
      this.bus.register(this as TBus[keyof TBus], name as any);
    }

    // Return Proxy to enable direct property access to bus-registered modules
    return new Proxy(this, {
      get(target, prop, receiver) {
        // First, check if property exists on instance
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }

        // Then try to resolve from bus registry
        const module = target.bus.get(prop as keyof TBus);
        if (module !== undefined) {
          return module;
        }

        // Default behavior for undefined properties
        return Reflect.get(target, prop, receiver);
      },
    });
  }
}
