import { CoreSDK } from '../../core-sdk/core-sdk';
import { ACCESS } from '../decorators/access';
import type { MethodAccess, PublicMethods } from '../decorators/access-types';
import {
  resolveAccess,
  type CanPerformContext,
  type CanPerformResult,
} from '../utils/can-perform';
import { BusRegistry, BusWithModules } from './bus-registry';

export type CsmSDKProps = {
  core: CoreSDK;
  bus?: BusRegistry;
};

export abstract class CsmSDKModule<TBus extends object = object> {
  readonly core: CoreSDK;
  readonly bus: BusWithModules<TBus>;

  constructor(props: CsmSDKProps, name?: string) {
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

  hasMethodAccess<K extends string & PublicMethods<this>>(
    method: K,
    ctx: CanPerformContext,
  ): CanPerformResult {
    const access = this.getMethodAccess(method);
    if (!access) return { allowed: true, reason: 'no access restriction' };
    return resolveAccess(access, ctx);
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
