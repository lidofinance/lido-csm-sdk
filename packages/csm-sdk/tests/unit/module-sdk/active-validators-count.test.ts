import { describe, it, expect } from 'vitest';
import { activeValidatorsCount } from '../../../src/module-sdk/active-validators-count';
import { ModuleDigest } from '../../../src/module-sdk/types';

const makeDigest = (
  totalDepositedValidators: bigint,
  totalExitedValidators: bigint,
  exitedValidatorsCount: bigint,
): ModuleDigest => ({
  nodeOperatorsCount: 0n,
  activeNodeOperatorsCount: 0n,
  state: {
    id: 1n,
    stakingModuleAddress: '0x0000000000000000000000000000000000000000',
    stakingModuleFee: 0n,
    treasuryFee: 0,
    stakeShareLimit: 0n,
    status: 0,
    name: 'module',
    lastDepositAt: 0n,
    lastDepositBlock: 0n,
    exitedValidatorsCount,
    priorityExitShareThreshold: 0,
    maxDepositsPerBlock: 0n,
    minDepositBlockDistance: 0n,
    withdrawalCredentialsType: 1,
    validatorsBalanceGwei: 0n,
  },
  summary: {
    totalExitedValidators,
    totalDepositedValidators,
    depositableValidatorsCount: 0n,
  },
});

describe('activeValidatorsCount', () => {
  it('subtracts the StakingRouter exited count when it exceeds the module summary', () => {
    const digest = makeDigest(1000n, 100n, 150n);

    expect(activeValidatorsCount(digest)).toBe(850n);
  });

  it('subtracts the module summary exited count when it exceeds the StakingRouter value', () => {
    const digest = makeDigest(1000n, 150n, 100n);

    expect(activeValidatorsCount(digest)).toBe(850n);
  });

  it('treats equal exited counts as either source', () => {
    const digest = makeDigest(1000n, 100n, 100n);

    expect(activeValidatorsCount(digest)).toBe(900n);
  });
});
