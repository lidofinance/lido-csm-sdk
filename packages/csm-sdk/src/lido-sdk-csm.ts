import { CONTRACT_NAMES } from './common/constants/contract-names';
import { MODULE_NAME } from './common/index';
import { SdkProps } from './core-sdk/index';
import { DepositQueueSDK } from './deposit-queue-sdk/deposit-queue-sdk';
import { PermissionlessGateSDK } from './permissionless-gate-sdk/permissionless-gate-sdk';
import { StakingModuleSDK } from './sm-sdk/staking-module-sdk';
import { SharedServices } from './sm-sdk/types';
import { StrikesSDK } from './strikes-sdk/strikes-sdk';
import { VettedGateSDK } from './vetted-gate-sdk/vetted-gate-sdk';

export class LidoSDKCsm extends StakingModuleSDK {
  readonly permissionlessGate: PermissionlessGateSDK;
  readonly icsGate: VettedGateSDK;
  readonly idvtcGate: VettedGateSDK;
  readonly strikes: StrikesSDK;
  readonly depositQueue: DepositQueueSDK;

  constructor(props: SdkProps, shared?: SharedServices) {
    super(props, MODULE_NAME.CSM, shared);
    this.permissionlessGate = new PermissionlessGateSDK(this.commonProps);
    this.icsGate = new VettedGateSDK(this.commonProps, CONTRACT_NAMES.icsGate);
    this.idvtcGate = new VettedGateSDK(
      this.commonProps,
      CONTRACT_NAMES.idvtcGate,
    );
    this.strikes = new StrikesSDK(this.commonProps, 'strikes');
    this.depositQueue = new DepositQueueSDK(this.commonProps, 'depositQueue');
  }
}
