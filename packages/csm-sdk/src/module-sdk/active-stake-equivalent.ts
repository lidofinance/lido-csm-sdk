import { MAX_EFFECTIVE_BALANCE_WC_TYPE_01_GWEI } from '../common/index';
import { ModuleDigest, WCType } from './types';

// StakingRouter v3 enforces `stakeShareLimit` on 32-ETH-validator-equivalents,
// not raw validator counts. A 0x02 (MaxEB / compounding) validator can hold up
// to 64x a 32-ETH validator's stake, so its raw count understates the module's
// share. Approximates SRLib._getModulesAllocationAndCapacity using the module's
// last-reported digest balance: 0x01 modules use the raw active count; 0x02
// modules use ceil(reportedStake / maxEBType1).
export const activeStakeEquivalent = (digest: ModuleDigest): bigint => {
  const { withdrawalCredentialsType, validatorsBalanceGwei } = digest.state;

  const active =
    digest.summary.totalDepositedValidators -
    digest.summary.totalExitedValidators;

  if (withdrawalCredentialsType !== WCType.TYPE_02) {
    return active;
  }

  // ceil-div: whole 32-ETH-equivalents backing this module's reported stake
  return (
    (validatorsBalanceGwei + MAX_EFFECTIVE_BALANCE_WC_TYPE_01_GWEI - 1n) /
    MAX_EFFECTIVE_BALANCE_WC_TYPE_01_GWEI
  );
};
