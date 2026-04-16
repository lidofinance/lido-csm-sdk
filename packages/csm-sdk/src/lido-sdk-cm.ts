import { AccountingSDK } from './accounting-sdk/accounting-sdk';
import { BondSDK } from './bond-sdk/bond-sdk';
import { BusRegistry } from './common/class-primitives/bus-registry';
import { MODULE_NAME } from './common/index';
import { CoreSDK } from './core-sdk/core-sdk';
import { prepareCoreProps, SdkProps } from './core-sdk/index';
import { CuratedGatesCollectionSDK } from './curated-gates-collection-sdk/curated-gates-collection-sdk';
import { DepositDataSDK } from './deposit-data-sdk/deposit-data-sdk';
import { DiscoverySDK } from './discovery-sdk/discovery-sdk';
import { EventsSDK } from './events-sdk/events-sdk';
import { FeesMonitoringSDK } from './fees-monitoring-sdk/fees-monitoring-sdk';
import { FrameSDK } from './frame-sdk/frame-sdk';
import { KeysCacheSDK } from './keys-cache-sdk/keys-cache-sdk';
import { KeysSDK } from './keys-sdk/keys-sdk';
import { KeysWithStatusSDK } from './keys-with-status-sdk/keys-with-status-sdk';
import { MetaRegistrySDK } from './meta-registry-sdk/meta-registry-sdk';
import { ModuleSDK } from './module-sdk/module-sdk';
import { OperatorSDK } from './operator-sdk/operator-sdk';
import { ParametersSDK } from './parameters-sdk/parameters-sdk';
import { RewardsSDK } from './rewards-sdk/rewards-sdk';
import { RolesSDK } from './roles-sdk/roles-sdk';
import { StealingSDK } from './stealing-sdk/stealing-sdk';
import { TxSDK } from './tx-sdk/tx-sdk';

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
