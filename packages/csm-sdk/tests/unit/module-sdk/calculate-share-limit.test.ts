import { describe, it, expect } from 'vitest';
import { calculateShareLimit } from '../../../src/module-sdk/calculate-share-limit';
import { ModuleDigest } from '../../../src/module-sdk/types';

const GWEI = 1_000_000_000n;

type DigestOverrides = {
  id: bigint;
  withdrawalCredentialsType?: number;
  deposited?: bigint;
  exited?: bigint;
  depositable?: bigint;
  stakeShareLimit?: bigint;
  validatorsBalanceGwei?: bigint;
};

const makeDigest = ({
  id,
  withdrawalCredentialsType = 1,
  deposited = 0n,
  exited = 0n,
  depositable = 0n,
  stakeShareLimit = 10_000n,
  validatorsBalanceGwei = 0n,
}: DigestOverrides): ModuleDigest => ({
  nodeOperatorsCount: 0n,
  activeNodeOperatorsCount: 0n,
  state: {
    id,
    stakingModuleAddress: '0x0000000000000000000000000000000000000000',
    stakingModuleFee: 0n,
    treasuryFee: 0,
    stakeShareLimit,
    status: 0,
    name: `module-${id}`,
    lastDepositAt: 0n,
    lastDepositBlock: 0n,
    exitedValidatorsCount: exited,
    priorityExitShareThreshold: 0,
    maxDepositsPerBlock: 0n,
    minDepositBlockDistance: 0n,
    withdrawalCredentialsType,
    validatorsBalanceGwei,
  },
  summary: {
    totalExitedValidators: exited,
    totalDepositedValidators: deposited,
    depositableValidatorsCount: depositable,
  },
});

// balance of N whole 32-ETH validators, expressed in gwei
const stakeGwei = (validators32Eth: bigint) => validators32Eth * 32n * GWEI;

describe('calculateShareLimit', () => {
  it('counts a 0x02 (MaxEB) module by 32-ETH stake-equivalents, not raw count', () => {
    // CSM is a 0x01 module near what a naive raw count calls its limit.
    const csm = makeDigest({
      id: 3n,
      withdrawalCredentialsType: 1,
      deposited: 2870n,
      exited: 0n,
      stakeShareLimit: 1600n, // 16%
      depositable: 50n,
    });
    // A 0x02 module: only 5000 raw validators, but holding stake equal to
    // 100000 x 32-ETH validators (compounding / MaxEB).
    const maxEb = makeDigest({
      id: 1n,
      withdrawalCredentialsType: 2,
      deposited: 5000n,
      exited: 0n,
      validatorsBalanceGwei: stakeGwei(100_000n),
    });

    const result = calculateShareLimit([csm, maxEb], 3n);

    // totalActive equivalents = 2870 + 100000 = 102870
    // capacity = 102870 * 1600 / 10000 = 16459
    // activeLeft = 16459 - 2870 = 13589  -> NOT reached
    expect(result).toEqual({
      active: 2870n,
      activeLeft: 13_589n,
      capacity: 16_459n,
      queue: 50n,
      shareLimit: 1600n,
    });
    expect(result.activeLeft).toBeGreaterThan(0n);
  });

  it('regression guard: raw-count denominator would falsely report REACHED', () => {
    const csm = makeDigest({
      id: 3n,
      deposited: 2870n,
      stakeShareLimit: 1600n,
    });
    const maxEb = makeDigest({
      id: 1n,
      withdrawalCredentialsType: 2,
      deposited: 5000n,
      validatorsBalanceGwei: stakeGwei(100_000n),
    });

    const { activeLeft } = calculateShareLimit([csm, maxEb], 3n);

    // Raw counting (2870 + 5000 = 7870) -> capacity 1259 -> activeLeft -1611.
    expect(activeLeft).not.toBe(-1611n);
    expect(activeLeft).toBeGreaterThan(0n);
  });

  it('leaves pure-0x01 module sets identical to the count-based formula', () => {
    const csm = makeDigest({
      id: 3n,
      deposited: 1000n,
      exited: 100n,
      stakeShareLimit: 1000n, // 10%
      depositable: 10n,
    });
    const curated = makeDigest({ id: 2n, deposited: 4000n, exited: 0n });

    const result = calculateShareLimit([csm, curated], 3n);

    // active = 900; totalActive = 900 + 4000 = 4900
    // capacity = 4900 * 1000 / 10000 = 490; activeLeft = 490 - 900 = -410
    expect(result).toEqual({
      active: 900n,
      activeLeft: -410n,
      capacity: 490n,
      queue: 10n,
      shareLimit: 1000n,
    });
  });

  it('ceil-divides 0x02 balances to whole 32-ETH equivalents', () => {
    // With shareLimit = 100% and a single module, result.active == its equivalent.
    const equivalentOf = (validatorsBalanceGwei: bigint) =>
      calculateShareLimit(
        [
          makeDigest({
            id: 1n,
            withdrawalCredentialsType: 2,
            validatorsBalanceGwei,
            stakeShareLimit: 10_000n,
          }),
        ],
        1n,
      ).active;

    expect(equivalentOf(0n)).toBe(0n);
    expect(equivalentOf(1n)).toBe(1n); // dust rounds up to 1
    expect(equivalentOf(32n * GWEI)).toBe(1n); // exactly full
    expect(equivalentOf(33n * GWEI)).toBe(2n); // 1 wei over -> 2
    expect(equivalentOf(64n * GWEI)).toBe(2n); // exactly 2 full
    expect(equivalentOf(96n * GWEI)).toBe(3n);
  });
});
