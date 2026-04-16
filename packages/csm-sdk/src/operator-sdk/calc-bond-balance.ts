import { STETH_ROUNDING_THRESHOLD } from '../common/index';
import { BondBalance } from '../common/types';

export const calcBondBalance = ({
  current,
  required,
  locked,
  debt,
  pendingToSplit,
}: Omit<BondBalance, 'delta' | 'isInsufficient'>): BondBalance => {
  const requiredWithoutLocked = required - locked; // TODO: also subtract bondDebt?

  let delta = current - requiredWithoutLocked;
  if (delta < 0 && delta > -STETH_ROUNDING_THRESHOLD) {
    delta = 0n;
  }

  const isInsufficient = delta < 0 || false;

  return {
    required: requiredWithoutLocked,
    current,
    locked,
    debt,
    pendingToSplit,
    delta: delta < 0 ? -delta : delta,
    isInsufficient,
  };
};
