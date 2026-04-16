import { AccountingSDK } from './accounting-sdk/accounting-sdk';
import { BondSDK } from './bond-sdk/bond-sdk';
import { BusRegistry } from './common/class-primitives/bus-registry';
import { MODULE_NAME } from './common/index';
import { CoreSDK } from './core-sdk/core-sdk';
import { prepareCoreProps, SdkProps } from './core-sdk/index';
import { DepositDataSDK } from './deposit-data-sdk/deposit-data-sdk';
import { DepositQueueSDK } from './deposit-queue-sdk/deposit-queue-sdk';
import { DiscoverySDK } from './discovery-sdk/discovery-sdk';
import { EventsSDK } from './events-sdk/events-sdk';
import { FeesMonitoringSDK } from './fees-monitoring-sdk/fees-monitoring-sdk';
import { FrameSDK } from './frame-sdk/frame-sdk';
import { IcsGateSDK } from './ics-gate-sdk/ics-gate-sdk';
import { KeysCacheSDK } from './keys-cache-sdk/keys-cache-sdk';
import { KeysSDK } from './keys-sdk/keys-sdk';
import { KeysWithStatusSDK } from './keys-with-status-sdk/keys-with-status-sdk';
import { ModuleSDK } from './module-sdk/module-sdk';
import { OperatorSDK } from './operator-sdk/operator-sdk';
import { ParametersSDK } from './parameters-sdk/parameters-sdk';
import { PermissionlessGateSDK } from './permissionless-gate-sdk/permissionless-gate-sdk';
import { RewardsSDK } from './rewards-sdk/rewards-sdk';
import { RolesSDK } from './roles-sdk/roles-sdk';
import { StealingSDK } from './stealing-sdk/stealing-sdk';
import { StrikesSDK } from './strikes-sdk/strikes-sdk';
import { TxSDK } from './tx-sdk/tx-sdk';

export class LidoSDKCsm {
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
  readonly permissionlessGate: PermissionlessGateSDK;
  readonly icsGate: IcsGateSDK;
  readonly strikes: StrikesSDK;
  readonly events: EventsSDK;
  readonly frame: FrameSDK;
  readonly depositQueue: DepositQueueSDK;
  readonly depositData: DepositDataSDK;
  readonly stealing: StealingSDK;
  readonly discovery: DiscoverySDK;
  readonly feesMonitoring: FeesMonitoringSDK;

  constructor(props: SdkProps) {
    const bus = new BusRegistry();
    this.core = new CoreSDK(prepareCoreProps(props, MODULE_NAME.CSM));

    const commonProps = { ...props, core: this.core, bus };
    this.tx = new TxSDK(commonProps, 'tx');
    this.module = new ModuleSDK(commonProps, 'module');
    this.accounting = new AccountingSDK(commonProps, 'accounting');
    this.permissionlessGate = new PermissionlessGateSDK(commonProps);
    this.icsGate = new IcsGateSDK(commonProps);
    this.parameters = new ParametersSDK(commonProps, 'parameters');
    this.operator = new OperatorSDK(commonProps, 'operator');
    this.keys = new KeysSDK(commonProps);
    this.keysWithStatus = new KeysWithStatusSDK(commonProps, 'keysWithStatus');
    this.keysCache = new KeysCacheSDK(commonProps, 'keysCache');
    this.bond = new BondSDK(commonProps);
    this.roles = new RolesSDK(commonProps);
    this.strikes = new StrikesSDK(commonProps, 'strikes');
    this.rewards = new RewardsSDK(commonProps);
    this.frame = new FrameSDK(commonProps, 'frame');
    this.events = new EventsSDK(commonProps, 'events');
    this.depositQueue = new DepositQueueSDK(commonProps);
    this.depositData = new DepositDataSDK(commonProps);
    this.stealing = new StealingSDK(commonProps);
    this.feesMonitoring = new FeesMonitoringSDK(commonProps);
    this.discovery = new DiscoverySDK(commonProps, 'discovery');
  }
}
