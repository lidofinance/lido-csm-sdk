import {
  MAX_EFFECTIVE_BALANCE_WC_TYPE_01_WEI,
  PERCENT_BASIS,
} from '../common/index';
import { activeStakeEquivalent } from './active-stake-equivalent';
import { activeStakeWei } from './active-stake-wei';
import { findModuleDigest } from './find-module-digest';
import { ModuleDigest, ShareLimitInfo } from './types';

export const calculateShareLimit = (
  digests: ModuleDigest[],
  moduleId: bigint,
  totalModuleStake: bigint,
): ShareLimitInfo => {
  const moduleDigest = findModuleDigest(digests, moduleId);
  const shareLimit = moduleDigest.state.stakeShareLimit;
  const stakeWeiOf = (digest: ModuleDigest) =>
    digest.state.id === moduleId ? totalModuleStake : undefined;

  const active = activeStakeEquivalent(moduleDigest, stakeWeiOf(moduleDigest));

  const queue = moduleDigest.summary.depositableValidatorsCount;

  const totalActive = digests.reduce(
    (acc, digest) => acc + activeStakeEquivalent(digest, stakeWeiOf(digest)),
    0n,
  );

  const capacity = (totalActive * shareLimit) / PERCENT_BASIS;

  const activeLeft = capacity - active;

  const activeWei = activeStakeWei(moduleDigest, stakeWeiOf(moduleDigest));

  const totalActiveWei = digests.reduce(
    (acc, digest) => acc + activeStakeWei(digest, stakeWeiOf(digest)),
    0n,
  );

  const capacityWei = (totalActiveWei * shareLimit) / PERCENT_BASIS;

  const queueWei = queue * MAX_EFFECTIVE_BALANCE_WC_TYPE_01_WEI;

  const activeLeftWei = capacityWei - activeWei;

  return {
    active,
    activeLeft,
    capacity,
    queue,
    shareLimit,
    activeWei,
    activeLeftWei,
    capacityWei,
    queueWei,
  };
};
