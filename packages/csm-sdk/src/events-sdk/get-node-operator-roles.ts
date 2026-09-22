import { Address, isAddressEqual, zeroAddress } from 'viem';
import { NodeOperatorShortInfo, ROLES } from '../common/index';

const ALL_ROLES = [ROLES.REWARDS, ROLES.MANAGER, ROLES.CLAIMER];

export const packRoles = (patch: Partial<Record<ROLES, boolean>>): ROLES[] =>
  ALL_ROLES.filter((role) => patch[role]);

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
