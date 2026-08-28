import {
  MAX_EFFECTIVE_BALANCE_WC_TYPE_01_WEI,
  WEI_PER_GWEI,
} from '../common/index';
import { activeValidatorsCount } from './active-validators-count';
import { ModuleDigest, WCType } from './types';

// Display counterpart to activeStakeEquivalent: active stake in wei, unrounded.
// 0x01 validators cap at 32 ETH effective, so count x 32 ETH is exact; 0x02
// modules report their balance directly, avoiding the equivalent's ceil-div.
// `stakeWei` overrides the digest's (stale, oracle-reported) `validatorsBalanceGwei`
// with the live `getTotalModuleStake()` value when supplied.
export const activeStakeWei = (
  digest: ModuleDigest,
  stakeWei?: bigint,
): bigint => {
  const { withdrawalCredentialsType, validatorsBalanceGwei } = digest.state;

  if (withdrawalCredentialsType === WCType.TYPE_02) {
    return stakeWei ?? validatorsBalanceGwei * WEI_PER_GWEI;
  }

  return activeValidatorsCount(digest) * MAX_EFFECTIVE_BALANCE_WC_TYPE_01_WEI;
};
