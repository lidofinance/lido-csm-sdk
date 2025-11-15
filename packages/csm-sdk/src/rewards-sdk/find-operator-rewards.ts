import { NodeOperatorId } from '../common/types.js';
import {
  OperatorRewards,
  RewardsReport,
  RewardsReportV1,
  RewardsReportV2,
  isRewardsReportV1,
  isRewardsReportV2,
  isRewardsReportV2Array,
} from './types.js';

const findOperatorRewardsV1 = (
  nodeOperatorId: NodeOperatorId,
  report: RewardsReportV1,
): OperatorRewards => {
  const threshold = report.threshold;
  const operator = report.operators[`${nodeOperatorId}`];

  if (!operator)
    return {
      distributed: 0n,
      validatorsCount: 0,
      validatorsOverThresholdCount: 0,
      threshold,
    };

  const validators = Object.values(operator.validators);

  const overThreshold = validators.filter(
    ({ perf, slashed }) =>
      !slashed && perf.assigned && perf.included / perf.assigned >= threshold,
  );

  return {
    distributed: BigInt(operator.distributed.toString()),
    validatorsCount: validators.length,
    validatorsOverThresholdCount: overThreshold.length,
    threshold,
  };
};

const findOperatorRewardsV2 = (
  nodeOperatorId: NodeOperatorId,
  reports: RewardsReportV2[],
): OperatorRewards => {
  const report = reports.at(-1);
  const operator = report?.operators[`${nodeOperatorId}`];

  if (!operator)
    return {
      distributed: 0n,
      validatorsCount: 0,
      validatorsOverThresholdCount: 0,
      threshold: 0,
    };

  const validators = Object.values(operator.validators);

  const overThreshold = validators.filter(
    ({ slashed, performance, threshold }) =>
      !slashed && performance >= threshold,
  );

  return {
    distributed: BigInt(operator.distributed_rewards.toString()),
    validatorsCount: validators.length,
    validatorsOverThresholdCount: overThreshold.length,
    threshold: 0, // V2 uses threshold 0
  };
};

export const findOperatorRewards = (
  nodeOperatorId: NodeOperatorId,
  report: RewardsReport,
): OperatorRewards => {
  if (isRewardsReportV1(report)) {
    return findOperatorRewardsV1(nodeOperatorId, report);
  } else if (isRewardsReportV2(report)) {
    return findOperatorRewardsV2(nodeOperatorId, [report]);
  } else if (isRewardsReportV2Array(report)) {
    return findOperatorRewardsV2(nodeOperatorId, report);
  } else {
    throw new Error('Unknown rewards report version');
  }
};
