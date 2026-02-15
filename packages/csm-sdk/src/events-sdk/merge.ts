import { ROLES } from '../common/index.js';
import { NodeOperator, NodeOperatorId } from '../common/types.js';

export type RoleModifier = {
  [key in ROLES]?: boolean; // true if the role is enabled, false if disabled, undefined if not specified - use current.
};

const allRoles = [ROLES.REWARDS, ROLES.MANAGER];

export const appendNodeOperator = (
  list: NodeOperator[],
  { id, roles }: NodeOperator,
) => {
  return mergeRoles(list, id, {
    [ROLES.MANAGER]: roles.includes(ROLES.MANAGER),
    [ROLES.REWARDS]: roles.includes(ROLES.REWARDS),
  });
};

export const mergeRoles = (
  _list: NodeOperator[],
  id: NodeOperatorId,
  patch: RoleModifier,
) => {
  const list = [..._list];
  const index = list.findIndex((item) => item.id === id);
  const item = applyPatch(list[index] ?? { id, roles: [] }, patch);
  list.splice(index >= 0 ? index : list.length, 1, item);
  return list;
};

export const isNotEmptyRoles = (item: NodeOperator) => item.roles.length > 0;

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
