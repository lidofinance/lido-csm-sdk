import { AllowanceSDK } from '../allowance-sdk/allowance-sdk';
import { MODULE_CONFIG, MODULE_NAME, SUPPORTED_CHAINS } from '../common/index';
import { ERROR_CODE, invariant } from '../common/utils/sdk-error';
import { KeysCacheSDK } from '../keys-cache-sdk/keys-cache-sdk';
import { WalletSDK } from '../wallet-sdk/wallet-sdk';
import { SM_SDK_CLASSES } from './module-classes';
import { createSharedServices } from './shared-services';
import { SmDiscoverySDK } from './sm-discovery-sdk';
import { SmSDK, SmSDKFor, SmSdkProps } from './types';

const deployedModules = (chainId: SUPPORTED_CHAINS): MODULE_NAME[] =>
  Object.values(MODULE_NAME).filter((name) => MODULE_CONFIG[name][chainId]);

/** Every staking module deployed on the chain behind one entry point, sharing wallet detection, allowances and the keys cache. */
export class LidoSmSDK {
  readonly wallet: WalletSDK;
  readonly allowance: AllowanceSDK;
  readonly keysCache: KeysCacheSDK;
  readonly modules: ReadonlyMap<MODULE_NAME, SmSDK>;
  readonly discovery: SmDiscoverySDK;
  readonly chainId: SUPPORTED_CHAINS;

  constructor({ modules: requested, ...props }: SmSdkProps) {
    this.chainId = props.core.chain.id as SUPPORTED_CHAINS;
    const names = requested
      ? [...new Set(requested)]
      : deployedModules(this.chainId);
    invariant(
      names.length > 0,
      `No modules to construct on chain ${this.chainId}`,
      ERROR_CODE.NOT_SUPPORTED,
    );

    const shared = createSharedServices(props);
    this.wallet = shared.wallet;
    this.allowance = shared.allowance;
    this.keysCache = shared.keysCache;

    const modules = new Map<MODULE_NAME, SmSDK>();
    for (const name of names) {
      modules.set(name, new SM_SDK_CLASSES[name](props, shared));
    }
    this.modules = modules;
    this.discovery = new SmDiscoverySDK(modules);
  }

  get moduleNames(): readonly MODULE_NAME[] {
    return [...this.modules.keys()];
  }

  get<M extends MODULE_NAME>(name: M): SmSDKFor<M> | undefined {
    return this.modules.get(name) as SmSDKFor<M> | undefined;
  }

  /** @throws SDKError NOT_SUPPORTED when the module was not constructed for this chain. */
  require<M extends MODULE_NAME>(name: M): SmSDKFor<M> {
    const sdk = this.get(name);
    invariant(
      sdk,
      `${name} is not available on chain ${this.chainId}`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    return sdk;
  }

  get csm() {
    return this.get(MODULE_NAME.CSM);
  }
  get csm02() {
    return this.get(MODULE_NAME.CSM_02);
  }
  get cm() {
    return this.get(MODULE_NAME.CM);
  }
}
