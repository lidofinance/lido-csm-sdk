import { ReadContractReturnType } from 'viem';
import { SMDiscoveryAbi } from '../abi/SMDiscovery';
import { NodeOperatorShortInfo } from '../common/types';
import { clearEmptyAddress } from '../common/utils/clear-empty-address';
import { NodeOperatorDiscoveryInfo } from './types';

type NodeOperatorShort = ReadContractReturnType<
  typeof SMDiscoveryAbi,
  'getOperatorsByCurveId'
>[number];

type NodeOperatorDiscovery = ReadContractReturnType<
  typeof SMDiscoveryAbi,
  'getAllNodeOperators'
>[number];

export const toShortInfo = (
  operator: NodeOperatorShort,
): NodeOperatorShortInfo => ({
  ...operator,
  nodeOperatorId: operator.id,
  rewardsAddress: operator.rewardAddress,
  claimerAddress: clearEmptyAddress(operator.claimerAddress),
});

export const toDiscoveryInfo = (
  operator: NodeOperatorDiscovery,
): NodeOperatorDiscoveryInfo => ({
  ...operator,
  nodeOperatorId: operator.id,
  rewardsAddress: operator.rewardAddress,
  claimerAddress: clearEmptyAddress(operator.claimerAddress),
  proposedManagerAddress: clearEmptyAddress(operator.proposedManagerAddress),
  proposedRewardsAddress: clearEmptyAddress(operator.proposedRewardAddress),
});
