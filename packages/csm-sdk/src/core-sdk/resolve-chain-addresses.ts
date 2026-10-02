import { COMMON_ADDRESSES, SUPPORTED_CHAINS } from '../common/index';
import { resolveFlatOverrides } from './resolve-overrided-addresses';
import { ContractAddresses, ResolveChainAddressesProps } from './types';

const CHAIN_WIDE_KEYS = new Set<string>(
  Object.values(COMMON_ADDRESSES).flatMap((addresses) =>
    Object.keys(addresses),
  ),
);

/** Chain-wide contracts: common addresses < flat overrides on chain-wide keys. */
export const resolveChainAddresses = ({
  chainId,
  overridedAddresses,
}: ResolveChainAddressesProps): ContractAddresses => ({
  ...COMMON_ADDRESSES[chainId as SUPPORTED_CHAINS],
  ...Object.fromEntries(
    Object.entries(resolveFlatOverrides(overridedAddresses)).filter(([key]) =>
      CHAIN_WIDE_KEYS.has(key),
    ),
  ),
});
