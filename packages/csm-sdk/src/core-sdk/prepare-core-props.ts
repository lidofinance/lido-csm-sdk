import {
  COMMON_ADDRESSES,
  MODULE_CONFIG,
  MODULE_NAME,
  SUPPORTED_CHAINS,
} from '../common/index.js';
import { CoreProps, SdkProps } from './types.js';

export const prepareCoreProps = (
  props: SdkProps,
  moduleName: MODULE_NAME,
): CoreProps => {
  const chainId = props.core.chain.id as SUPPORTED_CHAINS;
  const config = MODULE_CONFIG[moduleName][chainId];
  return {
    ...props,
    ...config,
    contractAddresses: {
      ...COMMON_ADDRESSES[chainId],
      ...config.contractAddresses,
      ...props.overridedAddresses,
    },
    moduleName,
  };
};
