import {
  COMMON_ADDRESSES,
  ERROR_CODE,
  invariant,
  MODULE_CONFIG,
  SUPPORTED_CHAINS,
} from '../common/index';
import { resolveOverridedAddresses } from './resolve-overrided-addresses';
import { ContractAddresses, GetContractAddressesProps } from './types';

/** Pure address resolver: common < module config < flat overrides < per-module overrides. Throws NOT_SUPPORTED if the module is not deployed on the chain. */
export const getContractAddresses = ({
  moduleName,
  chainId,
  overridedAddresses,
}: GetContractAddressesProps): ContractAddresses => {
  const config = MODULE_CONFIG[moduleName][chainId as SUPPORTED_CHAINS];
  invariant(
    config,
    `${moduleName} is not deployed on chain ${chainId}`,
    ERROR_CODE.NOT_SUPPORTED,
  );
  return {
    ...COMMON_ADDRESSES[chainId as SUPPORTED_CHAINS],
    ...config.contractAddresses,
    ...resolveOverridedAddresses(overridedAddresses, moduleName),
  };
};
