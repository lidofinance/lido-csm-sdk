import { AccountingSDK } from './accounting-sdk/accounting-sdk.js';
import { BondSDK } from './bond-sdk/bond-sdk.js';
import { BusRegistry } from './common/class-primitives/bus-registry.js';
import { CoreSDK, prepareCoreProps } from './core-sdk/core-sdk.js';
import { SdkProps } from './core-sdk/types.js';
import { DepositQueueSDK } from './deposit-queue-sdk/deposit-queue-sdk.js';
import { DepositDataSDK } from './deposit-data-sdk/deposit-data-sdk.js';
import { EventsSDK } from './events-sdk/events-sdk.js';
import { FeesMonitoringSDK } from './fees-monitoring-sdk/fees-monitoring-sdk.js';
import { IcsGateSDK } from './ics-gate-sdk/ics-gate-sdk.js';
import { KeysCacheSDK } from './keys-cache-sdk/keys-cache-sdk.js';
import { KeysSDK } from './keys-sdk/keys-sdk.js';
import { KeysWithStatusSDK } from './keys-with-status-sdk/keys-with-status-sdk.js';
import { ModuleSDK } from './module-sdk/module-sdk.js';
import { OperatorSDK } from './operator-sdk/operator-sdk.js';
import { ParametersSDK } from './parameters-sdk/parameters-sdk.js';
import { PermissionlessGateSDK } from './permissionless-gate-sdk/permissionless-gate-sdk.js';
import { RewardsSDK } from './rewards-sdk/rewards-sdk.js';
import { RolesSDK } from './roles-sdk/roles-sdk.js';
import { StrikesSDK } from './strikes-sdk/strikes-sdk.js';
import { FrameSDK } from './frame-sdk/frame-sdk.js';
import { StealingSDK } from './stealing-sdk/stealing-sdk.js';
import { SatelliteSDK } from './satellite-sdk/satellite-sdk.js';
import { TxSDK } from './tx-sdk/tx-sdk.js';

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
  readonly satellite: SatelliteSDK;
  readonly feesMonitoring: FeesMonitoringSDK;

  constructor(props: SdkProps) {
    const coreProps = prepareCoreProps(props);

    const bus = new BusRegistry();
    this.core = new CoreSDK(coreProps);

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
    this.satellite = new SatelliteSDK(commonProps, 'satellite');
    this.events = new EventsSDK(commonProps, 'events');
    this.depositQueue = new DepositQueueSDK(commonProps);
    this.depositData = new DepositDataSDK(commonProps);
    this.stealing = new StealingSDK(commonProps);
    this.feesMonitoring = new FeesMonitoringSDK(commonProps);
  }
}
