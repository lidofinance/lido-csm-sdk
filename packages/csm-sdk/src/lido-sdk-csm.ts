import { AccountingSDK } from './accounting-sdk/accounting-sdk.js';
import { BondSDK } from './bond-sdk/bond-sdk.js';
import { BusRegistry } from './common/class-primitives/bus-registry.js';
import { CoreSDK } from './core-sdk/core-sdk.js';
import { CsmCoreProps } from './core-sdk/types.js';
import { KeysSDK } from './keys-sdk/keys-sdk.js';
import { ModuleSDK } from './module-sdk/module-sdk.js';
import { OperatorSDK } from './operator-sdk/operator-sdk.js';
import { PermissionlessGateSDK } from './permissionless-gate-sdk/permissionless-gate-sdk.js';
import { RolesSDK } from './roles-sdk/roles-sdk.js';
import { SpendingSDK } from './spending-sdk/spending-sdk.js';
import { StakingRouterSDK } from './staking-router-sdk/staking-router-sdk.js';

export class LidoSDKCsm {
  readonly core: CoreSDK;
  readonly spending: SpendingSDK;
  readonly module: ModuleSDK;
  readonly accounting: AccountingSDK;
  readonly operator: OperatorSDK;
  readonly keys: KeysSDK;
  readonly bond: BondSDK;
  readonly roles: RolesSDK;
  readonly permissionlessGate: PermissionlessGateSDK;
  readonly stakingRouter: StakingRouterSDK;

  constructor(props: CsmCoreProps) {
    const bus = new BusRegistry();
    this.core = new CoreSDK(props);

    // FIXME: only "spending" used by bus
    const commonProps = { ...props, core: this.core, bus };
    this.spending = new SpendingSDK(commonProps, 'spending');
    this.module = new ModuleSDK(commonProps, 'module');
    this.accounting = new AccountingSDK(commonProps, 'accounting');
    this.operator = new OperatorSDK(commonProps);
    this.keys = new KeysSDK(commonProps);
    this.bond = new BondSDK(commonProps);
    this.roles = new RolesSDK(commonProps);
    this.permissionlessGate = new PermissionlessGateSDK(commonProps);
    this.stakingRouter = new StakingRouterSDK(commonProps);
  }
}
