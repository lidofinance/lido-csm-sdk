import { AccountingSDK } from './accounting-sdk/accounting-sdk.js';
import { BondSDK } from './bond-sdk/bond-sdk.js';
import { BusRegistry } from './common/class-primitives/bus-registry.js';
import { MODULE_NAME } from './common/index.js';
import { CoreSDK } from './core-sdk/core-sdk.js';
import { prepareCoreProps, SdkProps } from './core-sdk/index.js';
import { CuratedGatesCollectionSDK } from './curated-gates-collection-sdk/curated-gates-collection-sdk.js';
import { DepositDataSDK } from './deposit-data-sdk/deposit-data-sdk.js';
import { DiscoverySDK } from './discovery-sdk/discovery-sdk.js';
import { EventsSDK } from './events-sdk/events-sdk.js';
import { FeesMonitoringSDK } from './fees-monitoring-sdk/fees-monitoring-sdk.js';
import { FrameSDK } from './frame-sdk/frame-sdk.js';
import { KeysCacheSDK } from './keys-cache-sdk/keys-cache-sdk.js';
import { KeysSDK } from './keys-sdk/keys-sdk.js';
import { KeysWithStatusSDK } from './keys-with-status-sdk/keys-with-status-sdk.js';
import { MetaRegistrySDK } from './meta-registry-sdk/meta-registry-sdk.js';
import { ModuleSDK } from './module-sdk/module-sdk.js';
import { OperatorSDK } from './operator-sdk/operator-sdk.js';
import { ParametersSDK } from './parameters-sdk/parameters-sdk.js';
import { RewardsSDK } from './rewards-sdk/rewards-sdk.js';
import { RolesSDK } from './roles-sdk/roles-sdk.js';
import { StealingSDK } from './stealing-sdk/stealing-sdk.js';
import { TxSDK } from './tx-sdk/tx-sdk.js';

export class LidoSDKCm {
  readonly core: CoreSDK;
  readonly tx: TxSDK;
  readonly module: ModuleSDK;
  readonly accounting: AccountingSDK;
  readonly parameters: ParametersSDK;
  readonly operator: OperatorSDK;
  readonly rewards: RewardsSDK;
  readonly keys: KeysSDK;
  readonly keysWithStatus: KeysWithStatusSDK;
  readonly keysCache: KeysCacheSDK;
  readonly bond: BondSDK;
  readonly roles: RolesSDK;
  readonly events: EventsSDK;
  readonly frame: FrameSDK;
  readonly depositData: DepositDataSDK;
  readonly feesMonitoring: FeesMonitoringSDK;
  readonly curatedGates: CuratedGatesCollectionSDK;
  readonly metaRegistry: MetaRegistrySDK;
  readonly discovery: DiscoverySDK;
  readonly stealing: StealingSDK;

  constructor(props: SdkProps) {
    const bus = new BusRegistry();
    this.core = new CoreSDK(prepareCoreProps(props, MODULE_NAME.CM));

    const commonProps = { ...props, core: this.core, bus };
    this.tx = new TxSDK(commonProps, 'tx');
    this.module = new ModuleSDK(commonProps, 'module');
    this.accounting = new AccountingSDK(commonProps, 'accounting');
    this.parameters = new ParametersSDK(commonProps, 'parameters');
    this.operator = new OperatorSDK(commonProps, 'operator');
    this.keys = new KeysSDK(commonProps);
    this.keysWithStatus = new KeysWithStatusSDK(commonProps, 'keysWithStatus');
    this.keysCache = new KeysCacheSDK(commonProps, 'keysCache');
    this.bond = new BondSDK(commonProps);
    this.roles = new RolesSDK(commonProps);
    this.rewards = new RewardsSDK(commonProps);
    this.frame = new FrameSDK(commonProps, 'frame');
    this.events = new EventsSDK(commonProps, 'events');
    this.depositData = new DepositDataSDK(commonProps);
    this.feesMonitoring = new FeesMonitoringSDK(commonProps);
    this.curatedGates = new CuratedGatesCollectionSDK(commonProps);
    this.metaRegistry = new MetaRegistrySDK(commonProps);
    this.stealing = new StealingSDK(commonProps);
    this.discovery = new DiscoverySDK(commonProps, 'discovery');
  }
}
