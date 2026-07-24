import { PERCENT_BASIS } from '../common/index';
import { activeStakeEquivalent } from './active-stake-equivalent';
import { findModuleDigest } from './find-module-digest';
import { ModuleDigest, ShareLimitInfo } from './types';

export const calculateShareLimit = (
  digests: ModuleDigest[],
  moduleId: bigint,
): ShareLimitInfo => {
  const moduleDigest = findModuleDigest(digests, moduleId);
  const shareLimit = moduleDigest.state.stakeShareLimit;

  const active = activeStakeEquivalent(moduleDigest);

  const queue = moduleDigest.summary.depositableValidatorsCount;

  const totalActive = digests.reduce(
    (acc, digest) => acc + activeStakeEquivalent(digest),
    0n,
  );

  const capacity = (totalActive * shareLimit) / PERCENT_BASIS;

  const activeLeft = capacity - active;

  return {
    active,
    activeLeft,
    capacity,
    queue,
    shareLimit,
  };
};
