import { MODULE_NAME } from './common/index';
import { SdkProps } from './core-sdk/index';
import { DepositQueueSDK } from './deposit-queue-sdk/deposit-queue-sdk';
import { PermissionlessGateSDK } from './permissionless-gate-sdk/permissionless-gate-sdk';
import { StakingModuleSDK } from './sm-sdk/staking-module-sdk';
import { SharedServices } from './sm-sdk/types';
import { StrikesSDK } from './strikes-sdk/strikes-sdk';

export class LidoSDKCsm02 extends StakingModuleSDK {
  readonly permissionlessGate: PermissionlessGateSDK;
  readonly strikes: StrikesSDK;
  readonly depositQueue: DepositQueueSDK;

  constructor(props: SdkProps, shared?: SharedServices) {
    super(props, MODULE_NAME.CSM_02, shared);
    this.permissionlessGate = new PermissionlessGateSDK(this.commonProps);
    this.strikes = new StrikesSDK(this.commonProps, 'strikes');
    this.depositQueue = new DepositQueueSDK(this.commonProps, 'depositQueue');
  }
}
