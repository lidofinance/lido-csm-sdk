import { Address, isAddressEqual } from 'viem';
import { ROLES } from '../common/index.js';
import { NodeOperatorInfo } from '../operator-sdk/types.js';
import { packRoles } from './merge.js';

export const getNodeOperatorRoles = (
  {
    managerAddress,
    rewardsAddress,
  }: Pick<NodeOperatorInfo, 'rewardsAddress' | 'managerAddress'>,
  address: Address,
) =>
  packRoles({
    [ROLES.MANAGER]: isAddressEqual(managerAddress, address),
    [ROLES.REWARDS]: isAddressEqual(rewardsAddress, address),
  });
