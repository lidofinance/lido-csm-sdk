import { KEY_STATUS } from '../common/index.js';
import { compareLowercase } from '../common/utils/index.js';
import { StatusContext } from './types.js';

// Range predicates
const isDeposited = (ctx: StatusContext) =>
  ctx.keyIndex < ctx.info.totalDepositedKeys;

const isVetted = (ctx: StatusContext) =>
  ctx.keyIndex < ctx.info.totalVettedKeys;

// Lifecycle status
const getUnvettedStatus = (ctx: StatusContext): KEY_STATUS | null => {
  if (isVetted(ctx)) return null;
  if (ctx.duplicates?.includes(ctx.pubkey)) return KEY_STATUS.DUPLICATED;

  if (ctx.prefilled?.status) return KEY_STATUS.DUPLICATED;
  if (ctx.keyIndex === ctx.info.totalVettedKeys) return KEY_STATUS.INVALID;
  return KEY_STATUS.UNCHECKED;
};

const getVettedStatus = (ctx: StatusContext): KEY_STATUS | null => {
  if (isDeposited(ctx)) return null;
  if (ctx.info.enqueuedCount < ctx.info.depositableValidatorsCount) {
    return KEY_STATUS.NON_QUEUED;
  }
  return KEY_STATUS.DEPOSITABLE;
};

const getDepositedStatus = (ctx: StatusContext): KEY_STATUS => {
  if (ctx.withdrawalSubmitted?.includes(ctx.pubkey)) {
    return KEY_STATUS.WITHDRAWN;
  }
  if (ctx.prefilled?.status) return ctx.prefilled.status;
  return ctx.hasCLStatuses ? KEY_STATUS.ACTIVATION_PENDING : KEY_STATUS.ACTIVE;
};

const getLifecycleStatus = (ctx: StatusContext): KEY_STATUS =>
  getUnvettedStatus(ctx) ?? getVettedStatus(ctx) ?? getDepositedStatus(ctx);

// additional statuses
const checkSlashed = (ctx: StatusContext): boolean =>
  isDeposited(ctx) && !!ctx.prefilled?.slashed;

const checkWithStrikes = (ctx: StatusContext): boolean =>
  isDeposited(ctx) && ctx.hasStrikes;

const checkEjectable = (ctx: StatusContext): boolean =>
  isDeposited(ctx) &&
  ((ctx.prefilled?.status === KEY_STATUS.ACTIVE &&
    ctx.prefilled.activationEpoch < ctx.ejectableEpoch) ||
    !ctx.hasCLStatuses);

const checkExitRequested = (ctx: StatusContext): boolean =>
  isDeposited(ctx) &&
  ctx.requestedToExit.some((key) => compareLowercase(ctx.pubkey, key));

const checkUnbonded = (ctx: StatusContext): boolean =>
  ctx.unboundCount > 0 &&
  ctx.info.totalAddedKeys - ctx.keyIndex < ctx.unboundCount;

export const computeStatuses = (ctx: StatusContext): KEY_STATUS[] => {
  const statuses: KEY_STATUS[] = [];

  const lifecycle = getLifecycleStatus(ctx);
  statuses.push(lifecycle);

  const isSlashed = checkSlashed(ctx);
  if (isSlashed) statuses.push(KEY_STATUS.SLASHED);

  const canHaveAdditionalStatuses = ![
    KEY_STATUS.WITHDRAWN,
    KEY_STATUS.WITHDRAWAL_PENDING,
    KEY_STATUS.EXITING,
  ].includes(lifecycle);

  if (canHaveAdditionalStatuses) {
    if (!isSlashed && checkExitRequested(ctx))
      statuses.push(KEY_STATUS.EXIT_REQUESTED);

    if (!isSlashed && checkEjectable(ctx)) statuses.push(KEY_STATUS.EJECTABLE);

    if (checkWithStrikes(ctx)) statuses.push(KEY_STATUS.WITH_STRIKES);

    if (checkUnbonded(ctx)) statuses.push(KEY_STATUS.UNBONDED);
  }

  return statuses;
};
