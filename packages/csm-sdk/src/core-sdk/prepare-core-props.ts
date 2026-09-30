import { MODULE_CONFIG, MODULE_NAME, SUPPORTED_CHAINS } from '../common/index';
import { getContractAddresses } from './get-contract-addresses';
import { CoreProps, SdkProps } from './types';

export const prepareCoreProps = (
  props: SdkProps,
  moduleName: MODULE_NAME,
): CoreProps => {
  const chainId = props.core.chain.id as SUPPORTED_CHAINS;
  const contractAddresses = getContractAddresses({
    moduleName,
    chainId,
    overridedAddresses: props.overridedAddresses,
  });
  return {
    ...props,
    ...MODULE_CONFIG[moduleName][chainId]!,
    contractAddresses,
    moduleName,
  };
};
