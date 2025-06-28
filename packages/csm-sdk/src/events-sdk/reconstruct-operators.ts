/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Address, GetAbiItemReturnType, isAddressEqual, Log } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { ROLES } from '../common/index.js';
import { NodeOperator } from '../common/tyles.js';
import { isNotEmptyRoles, mergeRoles } from './merge.js';

type NodeOperatorLogs =
  | Log<
      bigint,
      number,
      false,
      GetAbiItemReturnType<typeof CSModuleAbi, 'NodeOperatorAdded'>,
      false
    >
  | Log<
      bigint,
      number,
      false,
      GetAbiItemReturnType<
        typeof CSModuleAbi,
        'NodeOperatorManagerAddressChanged'
      >,
      false
    >
  | Log<
      bigint,
      number,
      false,
      GetAbiItemReturnType<
        typeof CSModuleAbi,
        'NodeOperatorRewardAddressChanged'
      >,
      false
    >;

export const reconstructOperators = (
  logs: NodeOperatorLogs[],
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
