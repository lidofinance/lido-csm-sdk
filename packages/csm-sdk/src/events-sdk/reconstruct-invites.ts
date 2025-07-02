/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Address, GetAbiItemReturnType, isAddressEqual, Log } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { ROLES } from '../common/index.js';
import { NodeOperatorInvite } from '../common/types.js';

type ChangeAddressLogs =
  | Log<
      bigint,
      number,
      false,
      GetAbiItemReturnType<
        typeof CSModuleAbi,
        'NodeOperatorManagerAddressChangeProposed'
      >,
      false
    >
  | Log<
      bigint,
      number,
      false,
      GetAbiItemReturnType<
        typeof CSModuleAbi,
        'NodeOperatorRewardAddressChangeProposed'
      >,
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

export const reconstructInvites = (
  logs: ChangeAddressLogs[],
  address: Address,
): NodeOperatorInvite[] =>
  logs
    .reduce((invites, log) => {
      if (log.args.nodeOperatorId === undefined) {
        return invites;
      }
      switch (log.eventName) {
        case 'NodeOperatorManagerAddressChangeProposed':
          return isAddressEqual(log.args.newProposedAddress!, address)
            ? mergeInvites(invites, {
                id: log.args.nodeOperatorId,
                role: ROLES.MANAGER,
              })
            : mergeInvites(
                invites,
                { id: log.args.nodeOperatorId, role: ROLES.MANAGER },
                false,
              );
        case 'NodeOperatorRewardAddressChangeProposed':
          return isAddressEqual(log.args.newProposedAddress!, address)
            ? mergeInvites(invites, {
                id: log.args.nodeOperatorId,
                role: ROLES.REWARDS,
              })
            : mergeInvites(
                invites,
                { id: log.args.nodeOperatorId, role: ROLES.REWARDS },
                false,
              );
        case 'NodeOperatorManagerAddressChanged':
          return mergeInvites(
            invites,
            { id: log.args.nodeOperatorId, role: ROLES.MANAGER },
            false,
          );
        case 'NodeOperatorRewardAddressChanged':
          return mergeInvites(
            invites,
            { id: log.args.nodeOperatorId, role: ROLES.REWARDS },
            false,
          );

        default:
          return invites;
      }
    }, [] as NodeOperatorInvite[])
    .sort(
      (a, b) =>
        Number(a.id - b.id) ||
        -Number(b.role === ROLES.REWARDS) - Number(a.role === ROLES.REWARDS),
    );

const mergeInvites = (
  _list: NodeOperatorInvite[],
  invite: NodeOperatorInvite,
  add = true,
) => {
  const list = Array.from(_list);
  const index = list.findIndex(
    (item) => item.id === invite.id && item.role === invite.role,
  );

  if (add && !index) {
    list.push(invite);
  } else if (!add && index >= 0) {
    list.splice(index, 1);
  }
  return list;
};
