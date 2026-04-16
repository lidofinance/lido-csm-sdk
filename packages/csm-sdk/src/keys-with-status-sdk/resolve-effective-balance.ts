import { KEY_STATUS } from '../common/index';
import { MIN_EFFECTIVE_BALANCE } from './consts';
import { ClPreparedKey } from './parse-cl-response';

const ACTIVE_LIFECYCLE = [
  KEY_STATUS.ACTIVE,
  KEY_STATUS.ACTIVATION_PENDING,
  KEY_STATUS.EXITING,
  KEY_STATUS.WITHDRAWAL_PENDING,
] as const;

export const resolveEffectiveBalance = (props: {
  statuses: KEY_STATUS[];
  prefilled?: ClPreparedKey;
  allocatedBalance?: bigint;
}): bigint | undefined => {
  if (!ACTIVE_LIFECYCLE.some((status) => props.statuses.includes(status))) {
    return undefined;
  }

  if (props.prefilled) {
    return props.prefilled.effectiveBalance;
  }
  if (props.allocatedBalance !== undefined) {
    return props.allocatedBalance + MIN_EFFECTIVE_BALANCE;
  }
  return undefined;
};
