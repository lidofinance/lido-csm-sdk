import { resolveDeployment } from './resolve-deployment';
import { ContractAddresses, GetContractAddressesProps } from './types';

/** Projection of `resolveDeployment`: common < module config < flat overrides < per-module overrides. */
export const getContractAddresses = (
  props: GetContractAddressesProps,
): ContractAddresses => resolveDeployment(props).contractAddresses;
