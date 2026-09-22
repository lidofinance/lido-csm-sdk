import type { MODULE_NAME } from '../common/constants/module-name';
import type {
  NodeOperatorInviteInfo,
  NodeOperatorShortInfo,
} from '../common/types';
import type { SdkProps } from '../core-sdk/index';
import type { AllowanceSDK } from '../allowance-sdk/allowance-sdk';
import type { KeysCacheSDK } from '../keys-cache-sdk/keys-cache-sdk';
import type { WalletSDK } from '../wallet-sdk/wallet-sdk';
import type { SM_SDK_CLASSES } from './module-classes';

/** Chain-scoped services reused across every module SDK (see `LidoSmSDK`, `createSharedServices`). */
export type SharedServices = {
  keysCache: KeysCacheSDK;
  wallet: WalletSDK;
  allowance: AllowanceSDK;
};

export type SmSDKFor<M extends MODULE_NAME> = InstanceType<
  (typeof SM_SDK_CLASSES)[M]
>;
export type SmSDK = SmSDKFor<MODULE_NAME>;

export type SmSdkProps = SdkProps & {
  /** Modules to construct. Default: every module with a MODULE_CONFIG entry for the chain. */
  modules?: readonly MODULE_NAME[];
};

export type OperatorRef = {
  module: MODULE_NAME;
  operator: NodeOperatorShortInfo;
};
export type InviteRef = { module: MODULE_NAME; invite: NodeOperatorInviteInfo };
