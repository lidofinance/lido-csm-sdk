import { STETH_ROUNDING_THRESHOLD, TOKENS } from '../common/index.js';
import { SpendOptions } from './types.js';

const DEFAULT_DEADLINE_SEC = 3600;

const getDeadline = (ttlSec: number) =>
  BigInt(Math.floor(Date.now() / 1000) + ttlSec);

/**
 * Add 10 wei for approve/permit request
 * for stETH only
 */
export const parseSpendingProps = <T extends SpendOptions>(
  props: T,
): T & { amount: bigint; deadline: bigint } => {
  let { amount } = props;
  if (props.token === TOKENS.steth && amount > 0) {
    amount += STETH_ROUNDING_THRESHOLD;
  }

  const deadline = props.deadline ?? getDeadline(DEFAULT_DEADLINE_SEC);

  return { ...props, amount, deadline };
};
