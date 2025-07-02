import { ERROR_CODE, invariant } from '@lidofinance/lido-ethereum-sdk';
import { ModuleDigest, ShareLimitInfo } from './types.js';
import { PERCENT_BASIS } from '../common/index.js';

export const calculateShareLimit = (
  digests: ModuleDigest[],
  moduleId: number,
): ShareLimitInfo => {
  const moduleDigest = digests.find((digest) => digest.state.id === moduleId);
  invariant(
    moduleDigest,
    `CSM module (${moduleId}) is not connected to StakingRouter`,
    ERROR_CODE.NOT_SUPPORTED,
  );
  const shareLimit = BigInt(moduleDigest.state.stakeShareLimit);

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
