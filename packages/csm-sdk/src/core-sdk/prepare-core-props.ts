import {
  COMMON_ADDRESSES,
  ERROR_CODE,
  invariant,
  MODULE_CONFIG,
  MODULE_NAME,
  SUPPORTED_CHAINS,
} from '../common/index';
import { CoreProps, SdkProps } from './types';

export const prepareCoreProps = (
  props: SdkProps,
  moduleName: MODULE_NAME,
): CoreProps => {
  const chainId = props.core.chain.id as SUPPORTED_CHAINS;
  const config = MODULE_CONFIG[moduleName][chainId];
  invariant(
    config,
    `${moduleName} is not deployed on chain ${chainId}`,
    ERROR_CODE.NOT_SUPPORTED,
  );
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
