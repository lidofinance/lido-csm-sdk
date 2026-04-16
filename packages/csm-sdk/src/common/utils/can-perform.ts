import { type Address, isAddressEqual } from 'viem';

import { AccessLevel, type MethodAccess } from '../decorators/access-types';

export type CanPerformContext = {
  account: Address;
  operatorInfo?: {
    managerAddress: Address;
    rewardsAddress: Address;
    extendedManagerPermissions: boolean;
    proposedManagerAddress?: Address;
    proposedRewardsAddress?: Address;
    customRewardsClaimer?: Address;
  };
};

export type CanPerformResult = {
  allowed: boolean;
  reason: string;
};

const allow = (reason: string): CanPerformResult => ({
  allowed: true,
  reason,
});
const deny = (reason: string): CanPerformResult => ({
  allowed: false,
  reason,
});

const eq = (a: Address, b: Address | undefined): boolean =>
  b != null && isAddressEqual(a, b);

const checkCondition = (
  access: MethodAccess,
  extendedManagerPermissions: boolean,
): CanPerformResult | null => {
  const required = access.condition?.extendedManagerPermissions;
  if (required == null || required === extendedManagerPermissions) return null;
  const flag = required ? 'enabled' : 'disabled';
  return deny(`requires extendedManagerPermissions ${flag}`);
};

const checkAddress = (
  account: Address,
  expected: Address | undefined,
  role: string,
  denyReason: string,
): CanPerformResult => (eq(account, expected) ? allow(role) : deny(denyReason));

const resolveClaimer = (
  account: Address,
  info: NonNullable<CanPerformContext['operatorInfo']>,
): CanPerformResult => {
  if (eq(account, info.managerAddress)) return allow('MANAGER');
  if (eq(account, info.rewardsAddress)) return allow('REWARDS');
  if (eq(account, info.customRewardsClaimer)) return allow('CLAIMER');
  return deny('account is not claimer');
};

const resolveWithOperatorInfo = (
  access: MethodAccess,
  account: Address,
  info: NonNullable<CanPerformContext['operatorInfo']>,
): CanPerformResult => {
  const conditionResult = checkCondition(
    access,
    info.extendedManagerPermissions,
  );
  if (conditionResult) return conditionResult;

  const { level } = access;

  if (level === AccessLevel.MANAGER)
    return checkAddress(
      account,
      info.managerAddress,
      'MANAGER',
      'account is not manager',
    );

  if (level === AccessLevel.REWARDS)
    return checkAddress(
      account,
      info.rewardsAddress,
      'REWARDS',
      'account is not rewards address',
    );

  if (level === AccessLevel.OWNER) {
    const addr = info.extendedManagerPermissions
      ? info.managerAddress
      : info.rewardsAddress;
    return checkAddress(account, addr, 'OWNER', 'account is not owner');
  }

  if (level === AccessLevel.PROPOSED_MANAGER)
    return checkAddress(
      account,
      info.proposedManagerAddress,
      'PROPOSED_MANAGER',
      'account is not proposed manager',
    );

  if (level === AccessLevel.PROPOSED_REWARDS)
    return checkAddress(
      account,
      info.proposedRewardsAddress,
      'PROPOSED_REWARDS',
      'account is not proposed rewards',
    );

  if (level === AccessLevel.CLAIMER) return resolveClaimer(account, info);

  return deny(`unknown access level: ${String(level)}`);
};

export const resolveAccess = (
  access: MethodAccess,
  ctx: CanPerformContext,
): CanPerformResult => {
  if (access.level === AccessLevel.ANYONE) {
    return allow('ANYONE');
  }

  if (access.level === AccessLevel.PROTOCOL_ROLE) {
    const role = access.protocolRole ?? 'unknown';
    return deny(`requires protocol role: ${role}`);
  }

  if (!ctx.operatorInfo) {
    return deny('operatorInfo required');
  }

  return resolveWithOperatorInfo(access, ctx.account, ctx.operatorInfo);
};
