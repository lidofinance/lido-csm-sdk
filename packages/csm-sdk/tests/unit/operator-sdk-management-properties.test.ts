import { describe, expect, it } from 'vitest';
import { zeroAddress, type Address } from 'viem';
import { OperatorSDK } from '../../src/operator-sdk/operator-sdk';

const MANAGER: Address = '0x1111111111111111111111111111111111111111';
const REWARDS: Address = '0x2222222222222222222222222222222222222222';
const CLAIMER: Address = '0x3333333333333333333333333333333333333333';

const makeSdk = (claimer: Address) => {
  const accounting = {
    read: {
      getBondCurveId: async () => 7n,
      getCustomRewardsClaimer: async () => claimer,
    },
  };
  const module = {
    read: {
      getNodeOperatorManagementProperties: async () => ({
        managerAddress: MANAGER,
        rewardAddress: REWARDS,
        extendedManagerPermissions: true,
      }),
    },
  };
  const core = {
    cacheVersion: 0,
    getContract: () => accounting,
    contractBaseModule: module,
  } as any;
  return new OperatorSDK({ core });
};

describe('OperatorSDK.getManagementProperties', () => {
  it('returns the custom rewards claimer alongside management properties', async () => {
    const info = await makeSdk(CLAIMER).getManagementProperties(1n);
    expect(info).toEqual({
      nodeOperatorId: 1n,
      managerAddress: MANAGER,
      rewardsAddress: REWARDS,
      extendedManagerPermissions: true,
      curveId: 7n,
      claimerAddress: CLAIMER,
    });
  });

  it('normalizes an unset claimer (zeroAddress) to undefined', async () => {
    const info = await makeSdk(zeroAddress).getManagementProperties(1n);
    expect(info.claimerAddress).toBeUndefined();
  });
});
