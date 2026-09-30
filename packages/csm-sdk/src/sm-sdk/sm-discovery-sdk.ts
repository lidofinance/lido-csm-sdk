import type { Address } from 'viem';
import { MODULE_NAME } from '../common/constants/module-name';
import type {
  InviteRef,
  OperatorRef,
  SmDiscoveryOptions,
  SmSDK,
} from './types';

/**
 * Operator lookup across every module in a `LidoSmSDK`; results follow module insertion order.
 * Returns partial results when some modules fail; rejects with the first error only if all fail.
 */
export class SmDiscoverySDK {
  private readonly modules: ReadonlyMap<MODULE_NAME, SmSDK>;

  constructor(modules: ReadonlyMap<MODULE_NAME, SmSDK>) {
    this.modules = modules;
  }

  private async fanOut<T, R>(
    query: (sdk: SmSDK) => Promise<T[]>,
    tag: (module: MODULE_NAME, item: T) => R,
    { onModuleError }: SmDiscoveryOptions = {},
  ): Promise<R[]> {
    const entries = [...this.modules];
    const settled = await Promise.allSettled(
      entries.map(async ([module, sdk]) =>
        (await query(sdk)).map((item) => tag(module, item)),
      ),
    );

    if (settled.every((r) => r.status === 'rejected')) {
      throw (settled[0] as PromiseRejectedResult).reason;
    }

    return settled.flatMap((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      onModuleError?.((entries[i] as [MODULE_NAME, SmSDK])[0], result.reason);
      return [];
    });
  }

  public getNodeOperatorsByAddress(
    address: Address,
    options?: SmDiscoveryOptions,
  ): Promise<OperatorRef[]> {
    return this.fanOut(
      (sdk) => sdk.discovery.getNodeOperatorsByAddress(address),
      (module, operator) => ({ module, operator }),
      options,
    );
  }

  public getNodeOperatorsByProposedAddress(
    address: Address,
    options?: SmDiscoveryOptions,
  ): Promise<InviteRef[]> {
    return this.fanOut(
      (sdk) => sdk.discovery.getNodeOperatorsByProposedAddress(address),
      (module, invite) => ({ module, invite }),
      options,
    );
  }
}
