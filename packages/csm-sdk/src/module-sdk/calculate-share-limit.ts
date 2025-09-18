import { PERCENT_BASIS } from '../common/index.js';
import { findModuleDigest } from './find-module-digest.js';
import { ModuleDigest, ShareLimitInfo } from './types.js';

export const calculateShareLimit = (
  digests: ModuleDigest[],
  moduleId: number,
): ShareLimitInfo => {
  const moduleDigest = findModuleDigest(digests, moduleId);
  const shareLimit = moduleDigest.state.stakeShareLimit;

  const active =
    moduleDigest.summary.totalDepositedValidators -
    moduleDigest.summary.totalExitedValidators;

  const queue = moduleDigest.summary.depositableValidatorsCount;

  const totalActive = digests.reduce(
    (acc, { summary }) =>
      acc + summary.totalDepositedValidators - summary.totalExitedValidators,
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
