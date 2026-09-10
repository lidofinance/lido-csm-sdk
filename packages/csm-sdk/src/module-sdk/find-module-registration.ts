import { Address } from 'viem';
import { isModuleDigest } from './find-module-digest';
import { ModuleDigest, ModuleRegistration, StakingModuleStatus } from './types';

export const findModuleRegistration = (
  digests: ModuleDigest[],
  moduleId: bigint,
  moduleAddress: Address,
): ModuleRegistration => {
  const digest = digests.find((digest) =>
    isModuleDigest(digest, moduleId, moduleAddress),
  );
  if (!digest) return { registered: false, isActive: false };

  const status = digest.state.status as StakingModuleStatus;
  return {
    registered: true,
    isActive: status === StakingModuleStatus.ACTIVE,
  };
};
