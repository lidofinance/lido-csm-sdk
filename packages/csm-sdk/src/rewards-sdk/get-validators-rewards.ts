import { NodeOperatorId } from '../common/types.js';
import { isRewardsReportV1, isRewardsReportV2 } from './parse-report.js';
import { RewardsReportV1, RewardsReportV2, ValidatorRewards } from './types.js';

const DEFAULT_REWARD_SHARE = 0.5834;

const getBaseFields = (report: RewardsReportV1 | RewardsReportV2) => ({
  blockNumber: report.blockstamp.block_number,
  refSlot: report.blockstamp.ref_slot,
  frame: report.frame,
});

export const getValidatorsRewardsV1 = (
  nodeOperatorId: NodeOperatorId,
  report: RewardsReportV1,
): ValidatorRewards[] => {
  const operator = report.operators[`${nodeOperatorId}`];

  if (!operator) return [];

  const threshold = report.threshold;
  const totalDistributed = BigInt(operator.distributed.toString());

  const validators = Object.entries(operator.validators).map(
    ([validatorIndex, { perf, slashed }]) => {
      const performance = perf.assigned > 0 ? perf.included / perf.assigned : 0;
      return {
        validatorIndex: validatorIndex as `${number}`,
        slashed,
        performance,
        isEligible: !slashed && performance >= threshold && performance > 0,
      };
    },
  );

  const eligibleCount = validators.filter((v) => v.isEligible).length;
  const rewardPerValidator =
    eligibleCount > 0 ? totalDistributed / BigInt(eligibleCount) : 0n;

  return validators.map((v, indexInReport) => ({
    ...getBaseFields(report),
    indexInReport,
    validatorIndex: v.validatorIndex,
    performance: v.performance,
    slashed: v.slashed,
    threshold,
    // FIXME: continously subtract to prevent rounding issues
    receivedShares: v.isEligible ? rewardPerValidator : 0n,
    rewardShare: DEFAULT_REWARD_SHARE,
  }));
};

export const getValidatorsRewardsV2 = (
  nodeOperatorId: NodeOperatorId,
  report: RewardsReportV2,
): ValidatorRewards[] => {
  const operator = report.operators[`${nodeOperatorId}`];
  if (!operator) return [];

  return Object.entries(operator.validators).map(
    ([validatorIndex, validatorData], indexInReport) => ({
      ...getBaseFields(report),
      indexInReport,
      validatorIndex: validatorIndex as `${number}`,
      performance: validatorData.performance,
      threshold: validatorData.threshold,
      slashed: validatorData.slashed,
      receivedShares: validatorData.distributed_rewards,
      rewardShare: validatorData.rewards_share,
    }),
  );
};

export const getValidatorsRewards = (
  nodeOperatorId: NodeOperatorId,
  report: RewardsReportV1 | RewardsReportV2,
) => {
  if (isRewardsReportV1(report)) {
    return getValidatorsRewardsV1(nodeOperatorId, report);
  } else if (isRewardsReportV2(report)) {
    return getValidatorsRewardsV2(nodeOperatorId, report);
  } else {
    throw new Error('Unknown rewards report version');
  }
};
