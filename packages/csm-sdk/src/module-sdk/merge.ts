import { ROLES } from '../common/index.js';
import { NodeOperator, NodeOperatorId } from '../common/tyles.js';

export type RoleModifier = {
  [key in ROLES]?: boolean;
};

const allRoles = [ROLES.REWARDS, ROLES.MANAGER];

export const mergeRoles = (
  list: NodeOperator[],
  id: NodeOperatorId,
  patch: RoleModifier,
) => {
  const index = list.findIndex((item) => item.id === id);
  const item = applyPatch(list[index] ?? { id, roles: [] }, patch);
  list.splice(index >= 0 ? index : list.length, 1, item);
  return list;
};

export const empty = (item: NodeOperator) => item.roles.length === 0;

export const applyPatch = (
  item: NodeOperator,
  patch: RoleModifier,
): NodeOperator => ({
  ...item,
  roles: modifyRoles(item.roles, patch),
});

export const modifyRoles = (roles: ROLES[], patch: RoleModifier): ROLES[] =>
  packRoles({
    [ROLES.MANAGER]: patch[ROLES.MANAGER] ?? roles.includes(ROLES.MANAGER),
    [ROLES.REWARDS]: patch[ROLES.REWARDS] ?? roles.includes(ROLES.REWARDS),
  });

export const packRoles = (roles: RoleModifier): ROLES[] =>
  allRoles.filter((role) => roles[role]);
