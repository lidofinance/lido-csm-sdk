import { ERROR_CODE, invariant } from '@lidofinance/lido-ethereum-sdk';
import { ModuleDigest } from './types.js';

export const findModuleDigest = (
  digests: ModuleDigest[],
  moduleId: number,
): ModuleDigest => {
  const moduleDigest = digests.find((digest) => digest.state.id === moduleId);
  invariant(
    moduleDigest,
    `CSM module (${moduleId}) is not connected to StakingRouter`,
    ERROR_CODE.NOT_SUPPORTED,
  );
  return moduleDigest;
};
