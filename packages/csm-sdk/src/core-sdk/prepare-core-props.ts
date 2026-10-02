import { MODULE_NAME } from '../common/index';
import { resolveDeployment } from './resolve-deployment';
import { CoreProps, SdkProps } from './types';

export const prepareCoreProps = (
  { overridedAddresses, ...props }: SdkProps,
  moduleName: MODULE_NAME,
): CoreProps => {
  const { chainId: _chainId, ...deployment } = resolveDeployment({
    moduleName,
    chainId: props.core.chain.id,
    overridedAddresses,
  });
  return { ...props, ...deployment };
};
