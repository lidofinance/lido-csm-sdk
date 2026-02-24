import { Address, isAddressEqual } from 'viem';
import { ROLES } from '../common/index.js';
import { NodeOperator } from '../common/types.js';
import { isNotEmptyRoles, mergeRoles } from './merge.js';

export type NodeOperatorLog = {
  blockNumber: bigint;
  eventName: string;
  args: {
    nodeOperatorId?: bigint;
    managerAddress?: Address;
    rewardAddress?: Address;
    newAddress?: Address;
  };
};

export const reconstructOperators = (
  logs: NodeOperatorLog[],
  address: Address,
): NodeOperator[] =>
  logs
    .reduce((operators, log) => {
      if (log.args.nodeOperatorId === undefined) {
        return operators;
      }
      switch (log.eventName) {
        case 'NodeOperatorAdded':
          return mergeRoles(operators, log.args.nodeOperatorId, {
            [ROLES.MANAGER]: isAddressEqual(log.args.managerAddress!, address),
            [ROLES.REWARDS]: isAddressEqual(log.args.rewardAddress!, address),
          });
        case 'NodeOperatorManagerAddressChanged':
          return mergeRoles(operators, log.args.nodeOperatorId, {
            [ROLES.MANAGER]: isAddressEqual(log.args.newAddress!, address),
          });
        case 'NodeOperatorRewardAddressChanged':
          return mergeRoles(operators, log.args.nodeOperatorId, {
            [ROLES.REWARDS]: isAddressEqual(log.args.newAddress!, address),
          });
        default:
          return operators;
      }
    }, [] as NodeOperator[])
    .filter(isNotEmptyRoles);
