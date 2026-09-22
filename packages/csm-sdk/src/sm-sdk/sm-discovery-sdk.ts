import type { Address } from 'viem';
import { MODULE_NAME } from '../common/constants/module-name';
import type { InviteRef, OperatorRef, SmSDK } from './types';

/** Operator lookup across every module in a `LidoSmSDK`; results follow module insertion order. */
export class SmDiscoverySDK {
  private readonly modules: ReadonlyMap<MODULE_NAME, SmSDK>;

  constructor(modules: ReadonlyMap<MODULE_NAME, SmSDK>) {
    this.modules = modules;
  }

  private async fanOut<T, R>(
    query: (sdk: SmSDK) => Promise<T[]>,
    tag: (module: MODULE_NAME, item: T) => R,
  ): Promise<R[]> {
    const perModule = await Promise.all(
      [...this.modules].map(async ([module, sdk]) =>
        (await query(sdk)).map((item) => tag(module, item)),
      ),
    );
    return perModule.flat();
  }

  public getNodeOperatorsByAddress(address: Address): Promise<OperatorRef[]> {
    return this.fanOut(
      (sdk) => sdk.discovery.getNodeOperatorsByAddress(address),
      (module, operator) => ({ module, operator }),
    );
  }

  public getNodeOperatorsByProposedAddress(
    address: Address,
  ): Promise<InviteRef[]> {
    return this.fanOut(
      (sdk) => sdk.discovery.getNodeOperatorsByProposedAddress(address),
      (module, invite) => ({ module, invite }),
    );
  }
}
