import {
  ERROR_CODE,
  getModuleChainConfig,
  invariant,
  resolveModuleProfile,
} from '../common/index';
import { resolveChainAddresses } from './resolve-chain-addresses';
import { resolveOverridedAddresses } from './resolve-overrided-addresses';
import { Deployment, GetContractAddressesProps } from './types';

/** Pure resolver for a module on a chain; throws NOT_SUPPORTED if the module is not deployed there. */
export const resolveDeployment = ({
  moduleName,
  chainId,
  overridedAddresses,
}: GetContractAddressesProps): Deployment => {
  const config = getModuleChainConfig(moduleName, chainId);
  invariant(
    config,
    `${moduleName} is not deployed on chain ${chainId}`,
    ERROR_CODE.NOT_SUPPORTED,
  );
  return {
    moduleName,
    chainId,
    moduleId: config.moduleId,
    deploymentBlockNumber: config.deploymentBlockNumber,
    contractAddresses: {
      ...resolveChainAddresses({ chainId }),
      ...config.contractAddresses,
      ...resolveOverridedAddresses(overridedAddresses, moduleName),
    },
    profile: resolveModuleProfile(moduleName, chainId),
  };
};
