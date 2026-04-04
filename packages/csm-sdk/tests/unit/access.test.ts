import { describe, it, expect } from 'vitest';
import { Address } from 'viem';

import { Access, ACCESS } from '../../src/common/decorators/access.js';
import {
  AccessLevel,
  type MethodAccess,
} from '../../src/common/decorators/access-types.js';
import {
  resolveAccess,
  type CanPerformContext,
} from '../../src/common/utils/can-perform.js';

// --- Decorator & registry tests ---

class TestModule {
  @Access({ level: AccessLevel.ANYONE })
  public async open() {
    return 'ok';
  }

  @Access({ level: AccessLevel.MANAGER })
  public async managerOnly() {
    return 'ok';
  }

  public async noAccess() {
    return 'ok';
  }
}

describe('Access decorator', () => {
  it('stores metadata on the function via ACCESS symbol', () => {
    const proto = TestModule.prototype;
    const fn = proto.open as any;
    expect(fn[ACCESS]).toEqual({ level: AccessLevel.ANYONE });
  });

  it('stores MANAGER metadata', () => {
    const proto = TestModule.prototype;
    const fn = proto.managerOnly as any;
    expect(fn[ACCESS]).toEqual({ level: AccessLevel.MANAGER });
  });

  it('unannotated methods have no ACCESS symbol', () => {
    const proto = TestModule.prototype;
    const fn = proto.noAccess as any;
    expect(fn[ACCESS]).toBeUndefined();
  });

  it('metadata is frozen', () => {
    const proto = TestModule.prototype;
    const fn = proto.open as any;
    const access = fn[ACCESS];
    expect(Object.isFrozen(access)).toBe(true);
  });

  it('does not wrap the method (returns same function behavior)', async () => {
    const instance = new TestModule();
    expect(await instance.open()).toBe('ok');
    expect(await instance.managerOnly()).toBe('ok');
  });
});

// --- resolveAccess tests ---

const manager: Address = '0x1111111111111111111111111111111111111111';
const rewards: Address = '0x2222222222222222222222222222222222222222';
const claimer: Address = '0x3333333333333333333333333333333333333333';
const proposedManager: Address = '0x4444444444444444444444444444444444444444';
const proposedRewards: Address = '0x5555555555555555555555555555555555555555';
const stranger: Address = '0x9999999999999999999999999999999999999999';

const baseOperatorInfo = {
  managerAddress: manager,
  rewardsAddress: rewards,
  extendedManagerPermissions: false,
  proposedManagerAddress: proposedManager,
  proposedRewardsAddress: proposedRewards,
  customRewardsClaimer: claimer,
};

const ctx = (
  account: Address,
  overrides?: Partial<typeof baseOperatorInfo>,
): CanPerformContext => ({
  account,
  operatorInfo: { ...baseOperatorInfo, ...overrides },
});

describe('resolveAccess', () => {
  describe('ANYONE', () => {
    const access: MethodAccess = { level: AccessLevel.ANYONE };

    it('allows anyone', () => {
      expect(resolveAccess(access, { account: stranger })).toEqual({
        allowed: true,
        reason: 'ANYONE',
      });
    });
  });

  describe('MANAGER', () => {
    const access: MethodAccess = { level: AccessLevel.MANAGER };

    it('allows manager', () => {
      expect(resolveAccess(access, ctx(manager))).toEqual({
        allowed: true,
        reason: 'MANAGER',
      });
    });

    it('rejects non-manager', () => {
      expect(resolveAccess(access, ctx(stranger)).allowed).toBe(false);
    });

    it('rejects when operatorInfo missing', () => {
      expect(resolveAccess(access, { account: manager }).allowed).toBe(false);
    });
  });

  describe('REWARDS', () => {
    const access: MethodAccess = { level: AccessLevel.REWARDS };

    it('allows rewards address', () => {
      expect(resolveAccess(access, ctx(rewards))).toEqual({
        allowed: true,
        reason: 'REWARDS',
      });
    });

    it('rejects non-rewards', () => {
      expect(resolveAccess(access, ctx(stranger)).allowed).toBe(false);
    });
  });

  describe('OWNER', () => {
    const access: MethodAccess = { level: AccessLevel.OWNER };

    it('owner is rewards when extendedManagerPermissions=false', () => {
      expect(
        resolveAccess(
          access,
          ctx(rewards, { extendedManagerPermissions: false }),
        ),
      ).toEqual({
        allowed: true,
        reason: 'OWNER',
      });
      expect(
        resolveAccess(
          access,
          ctx(manager, { extendedManagerPermissions: false }),
        ).allowed,
      ).toBe(false);
    });

    it('owner is manager when extendedManagerPermissions=true', () => {
      expect(
        resolveAccess(
          access,
          ctx(manager, { extendedManagerPermissions: true }),
        ),
      ).toEqual({
        allowed: true,
        reason: 'OWNER',
      });
      expect(
        resolveAccess(
          access,
          ctx(rewards, { extendedManagerPermissions: true }),
        ).allowed,
      ).toBe(false);
    });
  });

  describe('PROPOSED_MANAGER', () => {
    const access: MethodAccess = { level: AccessLevel.PROPOSED_MANAGER };

    it('allows proposed manager', () => {
      expect(resolveAccess(access, ctx(proposedManager))).toEqual({
        allowed: true,
        reason: 'PROPOSED_MANAGER',
      });
    });

    it('rejects others', () => {
      expect(resolveAccess(access, ctx(manager)).allowed).toBe(false);
    });
  });

  describe('PROPOSED_REWARDS', () => {
    const access: MethodAccess = { level: AccessLevel.PROPOSED_REWARDS };

    it('allows proposed rewards', () => {
      expect(resolveAccess(access, ctx(proposedRewards))).toEqual({
        allowed: true,
        reason: 'PROPOSED_REWARDS',
      });
    });

    it('rejects others', () => {
      expect(resolveAccess(access, ctx(rewards)).allowed).toBe(false);
    });
  });

  describe('CLAIMER', () => {
    const access: MethodAccess = { level: AccessLevel.CLAIMER };

    it('allows manager', () => {
      expect(resolveAccess(access, ctx(manager)).allowed).toBe(true);
    });

    it('allows rewards', () => {
      expect(resolveAccess(access, ctx(rewards)).allowed).toBe(true);
    });

    it('allows custom claimer', () => {
      expect(resolveAccess(access, ctx(claimer)).allowed).toBe(true);
    });

    it('rejects stranger', () => {
      expect(resolveAccess(access, ctx(stranger)).allowed).toBe(false);
    });
  });

  describe('PROTOCOL_ROLE', () => {
    const access: MethodAccess = {
      level: AccessLevel.PROTOCOL_ROLE,
      protocolRole: 'REPORT_GENERAL_DELAYED_PENALTY_ROLE',
    };

    it('always returns not allowed (cannot be resolved client-side)', () => {
      const result = resolveAccess(access, ctx(manager));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('REPORT_GENERAL_DELAYED_PENALTY_ROLE');
    });
  });

  describe('conditions', () => {
    it('rejects when extendedManagerPermissions condition not met', () => {
      const access: MethodAccess = {
        level: AccessLevel.MANAGER,
        condition: { extendedManagerPermissions: true },
      };
      const result = resolveAccess(
        access,
        ctx(manager, { extendedManagerPermissions: false }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('extendedManagerPermissions');
    });

    it('allows when extendedManagerPermissions condition met', () => {
      const access: MethodAccess = {
        level: AccessLevel.MANAGER,
        condition: { extendedManagerPermissions: true },
      };
      expect(
        resolveAccess(
          access,
          ctx(manager, { extendedManagerPermissions: true }),
        ).allowed,
      ).toBe(true);
    });

    it('rejects when condition requires false but is true', () => {
      const access: MethodAccess = {
        level: AccessLevel.REWARDS,
        condition: { extendedManagerPermissions: false },
      };
      const result = resolveAccess(
        access,
        ctx(rewards, { extendedManagerPermissions: true }),
      );
      expect(result.allowed).toBe(false);
    });
  });
});
