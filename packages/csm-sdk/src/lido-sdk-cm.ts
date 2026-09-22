import { MODULE_NAME } from './common/index';
import { SdkProps } from './core-sdk/index';
import { CuratedGatesCollectionSDK } from './curated-gates-collection-sdk/curated-gates-collection-sdk';
import { MetaRegistrySDK } from './meta-registry-sdk/meta-registry-sdk';
import { StakingModuleSDK } from './sm-sdk/staking-module-sdk';
import { SharedServices } from './sm-sdk/types';

export class LidoSDKCm extends StakingModuleSDK {
  readonly curatedGates: CuratedGatesCollectionSDK;
  readonly metaRegistry: MetaRegistrySDK;

  constructor(props: SdkProps, shared?: SharedServices) {
    super(props, MODULE_NAME.CM, shared);
    this.curatedGates = new CuratedGatesCollectionSDK(this.commonProps);
    this.metaRegistry = new MetaRegistrySDK(this.commonProps);
  }
}
