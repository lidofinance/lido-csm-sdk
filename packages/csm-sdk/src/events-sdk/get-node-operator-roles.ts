import { Address, isAddressEqual, zeroAddress } from 'viem';
import { NodeOperatorShortInfo, ROLES } from '../common/index.js';
import { NodeOperatorInfo } from '../operator-sdk/types.js';
import { packRoles } from './merge.js';

export const getNodeOperatorRoles = (
  {
    managerAddress,
    rewardsAddress,
  }: Pick<NodeOperatorInfo, 'rewardsAddress' | 'managerAddress'>,
  address: Address = zeroAddress,
) =>
  packRoles({
    [ROLES.MANAGER]: isAddressEqual(managerAddress, address),
    [ROLES.REWARDS]: isAddressEqual(rewardsAddress, address),
  });

// TODO: move
export const appendNodeOperator = (
  list: NodeOperatorShortInfo[],
  value: NodeOperatorShortInfo,
): NodeOperatorShortInfo[] => {
  const index = list.findIndex(
    (item) => item.nodeOperatorId === value.nodeOperatorId,
  );
  if (index === -1) return [...list, value];
  return list.with(index, value);
};
