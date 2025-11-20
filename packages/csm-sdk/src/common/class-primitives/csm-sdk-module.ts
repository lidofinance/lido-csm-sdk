import { CoreSDK } from '../../core-sdk/core-sdk.js';
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

  constructor(props: CsmSDKProps, name?: string) {
    super();

    this.core = props.core;

    this.bus = (props.bus ?? new BusRegistry<TBus>()) as BusWithModules<TBus>;

    if (name) {
      this.bus.register(this as TBus[keyof TBus], name as keyof TBus);
    }
  }
}
