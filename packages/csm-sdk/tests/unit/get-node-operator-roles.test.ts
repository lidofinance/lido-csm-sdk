import { describe, expect, it } from 'vitest';
import { getNodeOperatorRoles } from '../../src/events-sdk/get-node-operator-roles';
import { ROLES } from '../../src/common/constants/roles';

const MANAGER = '0x1111111111111111111111111111111111111111';
const REWARDS = '0x2222222222222222222222222222222222222222';
const CLAIMER = '0x3333333333333333333333333333333333333333';
const OTHER = '0x4444444444444444444444444444444444444444';

const row = {
  managerAddress: MANAGER,
  rewardsAddress: REWARDS,
  claimerAddress: CLAIMER,
} as const;

describe('getNodeOperatorRoles', () => {
  it('returns CLAIMER for a claimer-only address', () => {
    expect(getNodeOperatorRoles(row, CLAIMER)).toEqual([ROLES.CLAIMER]);
  });

  it('returns MANAGER and CLAIMER in ALL_ROLES order when both match', () => {
    expect(
      getNodeOperatorRoles({ ...row, claimerAddress: MANAGER }, MANAGER),
    ).toEqual([ROLES.MANAGER, ROLES.CLAIMER]);
  });

  it('ignores the claimer when the row has none', () => {
    const { claimerAddress: _unused, ...noClaimer } = row;
    expect(getNodeOperatorRoles(noClaimer, CLAIMER)).toEqual([]);
    expect(getNodeOperatorRoles(noClaimer, REWARDS)).toEqual([ROLES.REWARDS]);
  });

  it('returns nothing for an unrelated address', () => {
    expect(getNodeOperatorRoles(row, OTHER)).toEqual([]);
  });

  it('matches case-insensitively', () => {
    expect(
      getNodeOperatorRoles(
        row,
        CLAIMER.toUpperCase().replace('0X', '0x') as `0x${string}`,
      ),
    ).toEqual([ROLES.CLAIMER]);
  });
});
