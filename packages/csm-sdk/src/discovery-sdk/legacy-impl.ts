import { AbiDecodingDataSizeTooSmallError, BaseError } from 'viem';
import { findRevertError } from '../common/utils/on-error';
import { SearchMode } from './types';

/** Enum conversion panic (0x21) — the legacy SearchMode enum tops out at ALL_ADDRESSES. */
export const ENUM_CONVERSION_PANIC = 0x21n;

export const isEnumConversionPanic = (error: unknown): boolean => {
  const revert = findRevertError(error);
  return (
    revert?.data?.errorName === 'Panic' &&
    revert.data.args?.[0] === ENUM_CONVERSION_PANIC
  );
};

export const UPGRADE_REQUIRED_MESSAGE =
  'SearchMode.CLAIMER and SearchMode.ANY_ROLE require the upgraded SMDiscovery implementation';

export const requiresUpgradedImpl = (mode: SearchMode) =>
  mode > SearchMode.ALL_ADDRESSES;

export type VersionedRead =
  'getNodeOperatorsByAddress' | 'getOperatorsByCurveId' | 'getAllNodeOperators';

// PositionOutOfBoundsError is not exported from viem's root, hence the name match.
export const isLegacyDecodeError = (error: unknown): boolean => {
  if (!(error instanceof BaseError)) return false;
  return (
    error.walk(
      (e) =>
        e instanceof AbiDecodingDataSizeTooSmallError ||
        (e instanceof BaseError && e.name === 'PositionOutOfBoundsError'),
    ) !== null
  );
};
