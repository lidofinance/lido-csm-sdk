import { Address } from 'viem';
import { describe, it, expect } from 'vitest';
import { ERROR_CODE } from '../../../src/common/utils/sdk-error-code';
import { findModuleDigest } from '../../../src/module-sdk/find-module-digest';
import { ModuleDigest } from '../../../src/module-sdk/types';

const MODULE_ADDRESS: Address = '0x0000000000000000000000000000000000000001';
const OTHER_ADDRESS: Address = '0x0000000000000000000000000000000000000002';

const makeDigest = (
  id: bigint,
  stakingModuleAddress: Address,
): ModuleDigest => ({
  nodeOperatorsCount: 0n,
  activeNodeOperatorsCount: 0n,
  state: {
    id,
    stakingModuleAddress,
    stakingModuleFee: 0n,
    treasuryFee: 0,
    stakeShareLimit: 0n,
    status: 0,
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

describe('findModuleDigest', () => {
  it('returns the digest matching both id and address', () => {
    const digest = makeDigest(3n, MODULE_ADDRESS);
    const other = makeDigest(1n, OTHER_ADDRESS);

    expect(findModuleDigest([other, digest], 3n, MODULE_ADDRESS)).toBe(digest);
  });

  it('throws NOT_SUPPORTED when no digest matches the id', () => {
    const digests = [makeDigest(1n, MODULE_ADDRESS)];

    expect(() => findModuleDigest(digests, 3n, MODULE_ADDRESS)).toThrowError(
      expect.objectContaining({ code: ERROR_CODE.NOT_SUPPORTED }),
    );
  });

  it('throws NOT_SUPPORTED when the id matches but the address does not', () => {
    const digests = [makeDigest(3n, OTHER_ADDRESS)];

    expect(() => findModuleDigest(digests, 3n, MODULE_ADDRESS)).toThrowError(
      expect.objectContaining({ code: ERROR_CODE.NOT_SUPPORTED }),
    );
  });
});
