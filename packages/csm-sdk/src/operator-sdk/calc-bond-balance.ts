import { STETH_ROUNDING_THRESHOLD } from '../common/index.js';
import { BondBalance } from '../common/types.js';

type Props = {
  current: bigint;
  required: bigint;
  locked: bigint;
  debt: bigint;
  pendingSharesToSplit: bigint;
};

export const calcBondBalance = ({
  current,
  required,
  locked,
  debt,
  pendingSharesToSplit,
}: Props): BondBalance => {
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
    pendingSharesToSplit,
    delta: delta < 0 ? -delta : delta,
    isInsufficient,
  };
};
