import { Address, isAddressEqual, zeroAddress } from 'viem';
import { NodeOperatorShortInfo, ROLES } from '../common/index';
import { packRoles } from './merge';

export const getNodeOperatorRoles = (
  {
    managerAddress,
    rewardsAddress,
    claimerAddress,
  }: Pick<
    NodeOperatorShortInfo,
    'managerAddress' | 'rewardsAddress' | 'claimerAddress'
  >,
  address: Address = zeroAddress,
) =>
  packRoles({
    [ROLES.MANAGER]: isAddressEqual(managerAddress, address),
    [ROLES.REWARDS]: isAddressEqual(rewardsAddress, address),
    [ROLES.CLAIMER]:
      !!claimerAddress && isAddressEqual(claimerAddress, address),
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
