import { ROLES } from '../common/index.js';
import { NodeOperator, NodeOperatorId } from '../common/types.js';

const ALL_ROLES = [ROLES.REWARDS, ROLES.MANAGER];

export const packRoles = (patch: Partial<Record<ROLES, boolean>>): ROLES[] =>
  ALL_ROLES.filter((role) => patch[role]);

export const mergeRoles = (
  list: NodeOperator[],
  id: NodeOperatorId,
  patch: Partial<Record<ROLES, boolean>>,
): NodeOperator[] => {
  const existing = list.find((item) => item.id === id);
  const roles = ALL_ROLES.filter(
    (role) => patch[role] ?? existing?.roles.includes(role) ?? false,
  );
  const updated: NodeOperator = { id, roles };
  return existing
    ? list.map((item) => (item.id === id ? updated : item))
    : [...list, updated];
};

export const isNotEmptyRoles = (item: NodeOperator) => item.roles.length > 0;
