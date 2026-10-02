import { MODULE_NAME, SUPPORTED_MODULES } from '../common/index';
import { ContractAddresses, OverridedAddresses } from './types';

const MODULE_KEYS: readonly string[] = SUPPORTED_MODULES;

const withoutUndefined = (addresses: ContractAddresses | undefined) =>
  Object.fromEntries(
    Object.entries(addresses ?? {}).filter(([, value]) => value !== undefined),
  ) as ContractAddresses;

/** Flat overrides only, module keys dropped; explicit `undefined` means unset. */
export const resolveFlatOverrides = (
  overrides: OverridedAddresses | undefined,
): ContractAddresses =>
  withoutUndefined(
    Object.fromEntries(
      Object.entries(overrides ?? {}).filter(
        ([key]) => !MODULE_KEYS.includes(key),
      ),
    ) as ContractAddresses,
  );

/** Flat overrides merged with `overrides[moduleName]`; per-module entries win and module keys never leak. */
export const resolveOverridedAddresses = (
  overrides: OverridedAddresses | undefined,
  moduleName: MODULE_NAME,
): ContractAddresses => ({
  ...resolveFlatOverrides(overrides),
  ...withoutUndefined(overrides?.[moduleName]),
});
