import { NodeOperatorId } from '../common/types.js';
import {
  isRewardsReportV1,
  isRewardsReportV2,
  isRewardsReportV2Array,
} from './parse-report.js';
import {
  OperatorRewards,
  RewardsReport,
  RewardsReportV1,
  RewardsReportV2,
} from './types.js';

const EMPTY_REWARDS: Omit<OperatorRewards, 'distributed'> = {
  shares: 0n,
  validatorsCount: 0,
  validatorsOverThresholdCount: 0,
  threshold: 0,
};

const findOperatorRewardsV1 = (
  nodeOperatorId: NodeOperatorId,
  report: RewardsReportV1,
) => {
  const threshold = report.threshold;
  const operator = report.operators[`${nodeOperatorId}`];

  if (!operator) return { ...EMPTY_REWARDS, threshold };

  const validators = Object.values(operator.validators);

  const overThreshold = validators.filter(
    ({ perf, slashed }) =>
      !slashed && perf.assigned && perf.included / perf.assigned >= threshold,
  );

  return {
    shares: operator.distributed,
    validatorsCount: validators.length,
    validatorsOverThresholdCount: overThreshold.length,
    threshold,
  };
};

const findOperatorRewardsV2 = (
  nodeOperatorId: NodeOperatorId,
  reports: RewardsReportV2[],
) => {
  const report = reports.at(-1);
  const operator = report?.operators[`${nodeOperatorId}`];

  if (!operator) return EMPTY_REWARDS;

  const validators = Object.values(operator.validators);

  const overThreshold = validators.filter(
    ({ slashed, performance, threshold }) =>
      !slashed && performance >= threshold,
  );

  return {
    shares: operator.distributed_rewards,
    validatorsCount: validators.length,
    validatorsOverThresholdCount: overThreshold.length,
    threshold: 0, // V2 uses threshold 0
  };
};

export const findOperatorRewards = (
  nodeOperatorId: NodeOperatorId,
  report: RewardsReport,
): Omit<OperatorRewards, 'distributed'> => {
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
