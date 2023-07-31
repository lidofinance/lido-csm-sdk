import { Address, GetAbiItemReturnType, Log } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { ROLES } from '../common/index.js';
import { NodeOperator } from '../common/tyles.js';
import { empty, mergeRoles } from './merge.js';
import { sortEventsByBlockNumber } from '../common/utils/sort-events.js';

type NodeOperatorLogs =
  | Log<
      bigint,
      number,
      false,
      GetAbiItemReturnType<typeof CSModuleAbi, 'NodeOperatorAdded'>,
      true
    >
  | Log<
      bigint,
      number,
      false,
      GetAbiItemReturnType<
        typeof CSModuleAbi,
        'NodeOperatorManagerAddressChanged'
      >,
      true
    >
  | Log<
      bigint,
      number,
      false,
      GetAbiItemReturnType<
        typeof CSModuleAbi,
        'NodeOperatorRewardAddressChanged'
      >,
      true
    >;

export const reconstructNodeOperators = (
  logs: NodeOperatorLogs[],
  address: Address,
): NodeOperator[] =>
  logs
    .sort(sortEventsByBlockNumber)
    .reduce((operators, log) => {
      switch (log.eventName) {
        case 'NodeOperatorAdded':
          return mergeRoles(operators, log.args.nodeOperatorId, {
            [ROLES.MANAGER]: log.args.managerAddress === address,
            [ROLES.REWARDS]: log.args.rewardAddress === address,
          });
        case 'NodeOperatorManagerAddressChanged':
          return mergeRoles(operators, log.args.nodeOperatorId, {
            [ROLES.MANAGER]: log.args.newAddress === address,
          });
        case 'NodeOperatorRewardAddressChanged':
          return mergeRoles(operators, log.args.nodeOperatorId, {
            [ROLES.REWARDS]: log.args.newAddress === address,
          });
        default:
          return operators;
      }
    }, [] as NodeOperator[])
    .filter(empty);
