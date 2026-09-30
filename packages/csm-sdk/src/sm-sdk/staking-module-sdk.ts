import { AccountingSDK } from '../accounting-sdk/accounting-sdk';
import { BondSDK } from '../bond-sdk/bond-sdk';
import { BusRegistry } from '../common/class-primitives/bus-registry';
import { CsmSDKProps } from '../common/class-primitives/csm-sdk-module';
import { MODULE_NAME } from '../common/index';
import { CoreSDK } from '../core-sdk/core-sdk';
import { prepareCoreProps, SdkProps } from '../core-sdk/index';
import { DelayedPenaltySDK } from '../delayed-penalty-sdk/delayed-penalty-sdk';
import { DepositDataSDK } from '../deposit-data-sdk/deposit-data-sdk';
import { DiscoverySDK } from '../discovery-sdk/discovery-sdk';
import { EventsSDK } from '../events-sdk/events-sdk';
import { FeesMonitoringSDK } from '../fees-monitoring-sdk/fees-monitoring-sdk';
import { FrameSDK } from '../frame-sdk/frame-sdk';
import { KeysCacheSDK } from '../keys-cache-sdk/keys-cache-sdk';
import { KeysSDK } from '../keys-sdk/keys-sdk';
import { KeysWithStatusSDK } from '../keys-with-status-sdk/keys-with-status-sdk';
import { ModuleSDK } from '../module-sdk/module-sdk';
import { OperatorSDK } from '../operator-sdk/operator-sdk';
import { ParametersSDK } from '../parameters-sdk/parameters-sdk';
import { RewardsSDK } from '../rewards-sdk/rewards-sdk';
import { RolesSDK } from '../roles-sdk/roles-sdk';
import { TxSDK } from '../tx-sdk/tx-sdk';
import { createSharedServices } from './shared-services';
import { SharedServices } from './types';

/** Everything a staking-module SDK has regardless of module type. */
export abstract class StakingModuleSDK {
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
  readonly delayedPenalty: DelayedPenaltySDK;
  readonly discovery: DiscoverySDK;
  readonly feesMonitoring: FeesMonitoringSDK;

  protected readonly commonProps: CsmSDKProps;

  constructor(
    props: SdkProps,
    moduleName: MODULE_NAME,
    shared: SharedServices = createSharedServices(props),
  ) {
    const bus = new BusRegistry<SharedServices>();
    this.core = new CoreSDK(prepareCoreProps(props, moduleName));
    this.commonProps = { core: this.core, bus: bus as BusRegistry };

    bus.register(shared.wallet, 'wallet');
    bus.register(shared.allowance, 'allowance');
    bus.register(shared.keysCache, 'keysCache');
    this.keysCache = shared.keysCache;

    this.tx = new TxSDK(this.commonProps, 'tx');
    this.module = new ModuleSDK(this.commonProps, 'module');
    this.accounting = new AccountingSDK(this.commonProps, 'accounting');
    this.parameters = new ParametersSDK(this.commonProps, 'parameters');
    this.operator = new OperatorSDK(this.commonProps, 'operator');
    this.keys = new KeysSDK(this.commonProps);
    this.keysWithStatus = new KeysWithStatusSDK(
      this.commonProps,
      'keysWithStatus',
    );
    this.bond = new BondSDK(this.commonProps);
    this.roles = new RolesSDK(this.commonProps);
    this.rewards = new RewardsSDK(this.commonProps);
    this.frame = new FrameSDK(this.commonProps, 'frame');
    this.events = new EventsSDK(this.commonProps, 'events');
    this.depositData = new DepositDataSDK(this.commonProps);
    this.delayedPenalty = new DelayedPenaltySDK(this.commonProps);
    this.feesMonitoring = new FeesMonitoringSDK(this.commonProps);
    this.discovery = new DiscoverySDK(this.commonProps, 'discovery');
  }
}
