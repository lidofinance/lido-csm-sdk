import { describe, it, expect } from 'vitest';
import { zeroAddress, type Address } from 'viem';
import {
  toShortInfo,
  toDiscoveryInfo,
} from '../../../src/discovery-sdk/map-operators';

const MANAGER: Address = '0x1111111111111111111111111111111111111111';
const REWARDS: Address = '0x2222222222222222222222222222222222222222';
const CLAIMER: Address = '0x3333333333333333333333333333333333333333';
const PROPOSED_MANAGER: Address = '0x4444444444444444444444444444444444444444';
const PROPOSED_REWARDS: Address = '0x5555555555555555555555555555555555555555';

const RAW_SHORT = {
  id: 7n,
  managerAddress: MANAGER,
  rewardAddress: REWARDS,
  extendedManagerPermissions: true,
  claimerAddress: CLAIMER,
  curveId: 2n,
};

describe('toShortInfo', () => {
  it('maps the raw struct into the short info shape', () => {
    expect(toShortInfo(RAW_SHORT)).toEqual({
      ...RAW_SHORT,
      nodeOperatorId: 7n,
      rewardsAddress: REWARDS,
      claimerAddress: CLAIMER,
    });
  });

  it('normalizes a zero-address claimer to undefined', () => {
    const result = toShortInfo({ ...RAW_SHORT, claimerAddress: zeroAddress });
    expect(result.claimerAddress).toBeUndefined();
  });

  it('preserves a non-zero claimer', () => {
    const result = toShortInfo(RAW_SHORT);
    expect(result.claimerAddress).toBe(CLAIMER);
  });
});

const RAW_FULL = {
  id: 7n,
  managerAddress: MANAGER,
  rewardAddress: REWARDS,
  extendedManagerPermissions: true,
  proposedManagerAddress: PROPOSED_MANAGER,
  proposedRewardAddress: PROPOSED_REWARDS,
  claimerAddress: CLAIMER,
  curveId: 2n,
};

describe('toDiscoveryInfo', () => {
  it('maps the raw struct into the full discovery info shape', () => {
    expect(toDiscoveryInfo(RAW_FULL)).toEqual({
      ...RAW_FULL,
      nodeOperatorId: 7n,
      rewardsAddress: REWARDS,
      proposedRewardsAddress: PROPOSED_REWARDS,
    });
  });

  it('normalizes a zero-address claimer to undefined', () => {
    const result = toDiscoveryInfo({
      ...RAW_FULL,
      claimerAddress: zeroAddress,
    });
    expect(result.claimerAddress).toBeUndefined();
  });

  it('normalizes zero-address proposed manager/rewards to undefined', () => {
    const result = toDiscoveryInfo({
      ...RAW_FULL,
      proposedManagerAddress: zeroAddress,
      proposedRewardAddress: zeroAddress,
    });
    expect(result.proposedManagerAddress).toBeUndefined();
    expect(result.proposedRewardsAddress).toBeUndefined();
  });
});
