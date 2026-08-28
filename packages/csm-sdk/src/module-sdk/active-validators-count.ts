import { ModuleDigest } from './types';

// SRLib._getModulesAllocationAndCapacity: a module's own summary can lag the exit
// count StakingRouter has already accounted for, so the larger of the two wins.
export const activeValidatorsCount = (digest: ModuleDigest): bigint => {
  const exited =
    digest.summary.totalExitedValidators > digest.state.exitedValidatorsCount
      ? digest.summary.totalExitedValidators
      : digest.state.exitedValidatorsCount;

  return digest.summary.totalDepositedValidators - exited;
};
