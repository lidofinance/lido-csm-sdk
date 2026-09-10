import { Address, isAddressEqual } from 'viem';
import { ERROR_CODE, invariant } from '../common/index';
import { ModuleDigest } from './types';

export const isModuleDigest = (
  digest: ModuleDigest,
  moduleId: bigint,
  moduleAddress: Address,
): boolean =>
  digest.state.id === moduleId &&
  isAddressEqual(digest.state.stakingModuleAddress, moduleAddress);

export const findModuleDigest = (
  digests: ModuleDigest[],
  moduleId: bigint,
  moduleAddress: Address,
): ModuleDigest => {
  const moduleDigest = digests.find((digest) =>
    isModuleDigest(digest, moduleId, moduleAddress),
  );
  invariant(
    moduleDigest,
    `CSM module (${moduleId}) is not connected to StakingRouter`,
    ERROR_CODE.NOT_SUPPORTED,
  );
  return moduleDigest;
};
