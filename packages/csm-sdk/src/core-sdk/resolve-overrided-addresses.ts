import { MODULE_NAME } from '../common/index';
import { ContractAddresses, OverridedAddresses } from './types';

const MODULE_KEYS: readonly string[] = Object.values(MODULE_NAME);

/** Flat overrides merged with `overrides[moduleName]`; per-module entries win and module keys never leak. */
export const resolveOverridedAddresses = (
  overrides: OverridedAddresses | undefined,
  moduleName: MODULE_NAME,
): ContractAddresses => {
  if (!overrides) return {};
  const flat = Object.fromEntries(
    Object.entries(overrides).filter(([key]) => !MODULE_KEYS.includes(key)),
  );
  return { ...flat, ...overrides[moduleName] };
};
