import { NodeOperatorId } from '../common/types.js';
import {
  isRewardsReportV1,
  isRewardsReportV2,
  isRewardsReportV2Array,
} from './parse-report.js';
import {
  RewardsReport,
  RewardsReportV1,
  RewardsReportV2,
  ValidatorRewards,
} from './types.js';

// TODO: parse as bigint
const getBaseFields = (report: RewardsReportV1 | RewardsReportV2) => ({
  blockNumber: BigInt(report.blockstamp.block_number),
  refSlot: BigInt(report.blockstamp.ref_slot),
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
    receivedShares: v.isEligible ? rewardPerValidator : 0n, // FIXME: continously subtract to prevent rounding issues
    fee: 0n, // Will be calculated in getOperatorRewardsHistory
  }));
};

export const getValidatorsRewardsV2 = (
  nodeOperatorId: NodeOperatorId,
  reports: RewardsReportV2[],
): ValidatorRewards[] => {
  return reports.flatMap((report) => {
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
        receivedShares: BigInt(validatorData.distributed_rewards.toString()),
        fee: 0n, // Will be calculated in getOperatorRewardsHistory
      }),
    );
  });
};

export const getValidatorsRewards = (
  nodeOperatorId: NodeOperatorId,
  report: RewardsReport,
) => {
  if (isRewardsReportV1(report)) {
    return getValidatorsRewardsV1(nodeOperatorId, report);
  } else if (isRewardsReportV2(report)) {
    return getValidatorsRewardsV2(nodeOperatorId, [report]);
  } else if (isRewardsReportV2Array(report)) {
    return getValidatorsRewardsV2(nodeOperatorId, report);
  } else {
    throw new Error('Unknown rewards report version');
  }
};
