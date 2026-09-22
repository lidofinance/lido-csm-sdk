import { MODULE_NAME } from '../common/index';
import { SdkProps } from '../core-sdk/index';
import { LidoSDKCm } from '../lido-sdk-cm';
import { LidoSDKCsm } from '../lido-sdk-csm';
import { LidoSDKCsm02 } from '../lido-sdk-csm02';
import type { StakingModuleSDK } from './staking-module-sdk';
import type { SharedServices } from './types';

export const SM_SDK_CLASSES = {
  [MODULE_NAME.CSM]: LidoSDKCsm,
  [MODULE_NAME.CSM_02]: LidoSDKCsm02,
  [MODULE_NAME.CM]: LidoSDKCm,
} satisfies Record<
  MODULE_NAME,
  new (props: SdkProps, shared?: SharedServices) => StakingModuleSDK
>;
