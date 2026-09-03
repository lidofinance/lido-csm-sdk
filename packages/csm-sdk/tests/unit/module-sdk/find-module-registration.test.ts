import { Address } from 'viem';
import { describe, it, expect } from 'vitest';
import { findModuleRegistration } from '../../../src/module-sdk/find-module-registration';
import {
  ModuleDigest,
  StakingModuleStatus,
} from '../../../src/module-sdk/types';

const MODULE_ADDRESS: Address = '0x0000000000000000000000000000000000000001';
const OTHER_ADDRESS: Address = '0x0000000000000000000000000000000000000002';

const makeDigest = (
  id: bigint,
  stakingModuleAddress: Address,
  status: number,
): ModuleDigest => ({
  nodeOperatorsCount: 0n,
  activeNodeOperatorsCount: 0n,
  state: {
    id,
    stakingModuleAddress,
    stakingModuleFee: 0n,
    treasuryFee: 0,
    stakeShareLimit: 0n,
    status,
    name: `module-${id}`,
    lastDepositAt: 0n,
    lastDepositBlock: 0n,
    exitedValidatorsCount: 0n,
    priorityExitShareThreshold: 0,
    maxDepositsPerBlock: 0n,
    minDepositBlockDistance: 0n,
    withdrawalCredentialsType: 1,
    validatorsBalanceGwei: 0n,
  },
  summary: {
    totalExitedValidators: 0n,
    totalDepositedValidators: 0n,
    depositableValidatorsCount: 0n,
  },
});

describe('findModuleRegistration', () => {
  it('reports registered and active for status ACTIVE', () => {
    const digest = makeDigest(3n, MODULE_ADDRESS, StakingModuleStatus.ACTIVE);

    expect(findModuleRegistration([digest], 3n, MODULE_ADDRESS)).toEqual({
      registered: true,
      isActive: true,
    });
  });

  it('reports registered but inactive for status DEPOSITS_PAUSED', () => {
    const digest = makeDigest(
      3n,
      MODULE_ADDRESS,
      StakingModuleStatus.DEPOSITS_PAUSED,
    );

    expect(findModuleRegistration([digest], 3n, MODULE_ADDRESS)).toEqual({
      registered: true,
      isActive: false,
    });
  });

  it('reports registered but inactive for status STOPPED', () => {
    const digest = makeDigest(3n, MODULE_ADDRESS, StakingModuleStatus.STOPPED);

    expect(findModuleRegistration([digest], 3n, MODULE_ADDRESS)).toEqual({
      registered: true,
      isActive: false,
    });
  });

  it('reports not registered when no digest matches the id', () => {
    const digest = makeDigest(1n, MODULE_ADDRESS, StakingModuleStatus.ACTIVE);

    expect(findModuleRegistration([digest], 3n, MODULE_ADDRESS)).toEqual({
      registered: false,
      isActive: false,
    });
  });

  it('reports not registered when the id matches but the address does not', () => {
    const digest = makeDigest(3n, OTHER_ADDRESS, StakingModuleStatus.ACTIVE);

    expect(findModuleRegistration([digest], 3n, MODULE_ADDRESS)).toEqual({
      registered: false,
      isActive: false,
    });
  });
});
