import { ERROR_CODE, invariant } from '../common/index.js';
import { ModuleDigest } from './types.js';

export const findModuleDigest = (
  digests: ModuleDigest[],
  moduleId: bigint,
): ModuleDigest => {
  const moduleDigest = digests.find((digest) => digest.state.id === moduleId);
  invariant(
    moduleDigest,
    `CSM module (${moduleId}) is not connected to StakingRouter`,
    ERROR_CODE.NOT_SUPPORTED,
  );
  return moduleDigest;
};
