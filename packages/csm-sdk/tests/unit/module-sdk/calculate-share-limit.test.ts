import { describe, it, expect } from 'vitest';
import { MAX_EFFECTIVE_BALANCE_WC_TYPE_01_WEI } from '../../../src/common/index';
import { calculateShareLimit } from '../../../src/module-sdk/calculate-share-limit';
import { ModuleDigest } from '../../../src/module-sdk/types';

const GWEI = 1_000_000_000n;
const WEI_PER_GWEI = 1_000_000_000n;

type DigestOverrides = {
  id: bigint;
  withdrawalCredentialsType?: number;
  deposited?: bigint;
  exited?: bigint;
  // StakingRouter's own accounting figure; defaults to `exited` so tests that
  // don't exercise the max() against it stay unaffected.
  srExited?: bigint;
  depositable?: bigint;
  stakeShareLimit?: bigint;
  validatorsBalanceGwei?: bigint;
};

const makeDigest = ({
  id,
  withdrawalCredentialsType = 1,
  deposited = 0n,
  exited = 0n,
  srExited = exited,
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
    exitedValidatorsCount: srExited,
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

// balance of N whole 32-ETH validators, expressed in gwei (digest field's unit)
const stakeGwei = (validators32Eth: bigint) => validators32Eth * 32n * GWEI;

// balance of N whole 32-ETH validators, expressed in wei
const stakeWei = (validators32Eth: bigint) =>
  stakeGwei(validators32Eth) * WEI_PER_GWEI;

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

    // queried module is 0x01, so totalModuleStake is ignored
    const result = calculateShareLimit([csm, maxEb], 3n, 0n);

    // totalActive equivalents = 2870 + 100000 = 102870
    // capacity = 102870 * 1600 / 10000 = 16459
    // activeLeft = 16459 - 2870 = 13589  -> NOT reached
    expect(result).toEqual({
      active: 2870n,
      activeLeft: 13_589n,
      capacity: 16_459n,
      queue: 50n,
      shareLimit: 1600n,
      activeWei: 91_840_000_000_000_000_000_000n,
      activeLeftWei: 434_854_400_000_000_000_000_000n,
      capacityWei: 526_694_400_000_000_000_000_000n,
      queueWei: 1_600_000_000_000_000_000_000n,
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

    const { activeLeft } = calculateShareLimit([csm, maxEb], 3n, 0n);

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

    const result = calculateShareLimit([csm, curated], 3n, 0n);

    // active = 900; totalActive = 900 + 4000 = 4900
    // capacity = 4900 * 1000 / 10000 = 490; activeLeft = 490 - 900 = -410
    expect(result).toEqual({
      active: 900n,
      activeLeft: -410n,
      capacity: 490n,
      queue: 10n,
      shareLimit: 1000n,
      activeWei: 28_800_000_000_000_000_000_000n,
      activeLeftWei: -13_120_000_000_000_000_000_000n,
      capacityWei: 15_680_000_000_000_000_000_000n,
      queueWei: 320_000_000_000_000_000_000n,
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
        validatorsBalanceGwei * WEI_PER_GWEI,
      ).active;

    expect(equivalentOf(0n)).toBe(0n);
    expect(equivalentOf(1n)).toBe(1n); // dust rounds up to 1
    expect(equivalentOf(32n * GWEI)).toBe(1n); // exactly full
    expect(equivalentOf(33n * GWEI)).toBe(2n); // 1 wei over -> 2
    expect(equivalentOf(64n * GWEI)).toBe(2n); // exactly 2 full
    expect(equivalentOf(96n * GWEI)).toBe(3n);
  });

  it('leaves the wei fields an exact scale of the count fields when no 0x02 module is present', () => {
    const csm = makeDigest({
      id: 3n,
      deposited: 1000n,
      exited: 100n,
      stakeShareLimit: 1000n,
      depositable: 10n,
    });
    const curated = makeDigest({ id: 2n, deposited: 4000n, exited: 0n });

    const result = calculateShareLimit([csm, curated], 3n, 0n);

    expect(result.activeWei).toBe(
      result.active * MAX_EFFECTIVE_BALANCE_WC_TYPE_01_WEI,
    );
    expect(result.capacityWei).toBe(
      result.capacity * MAX_EFFECTIVE_BALANCE_WC_TYPE_01_WEI,
    );
  });

  it('0x02 wei field keeps full precision that the ceil-divided count loses', () => {
    const maxEb = makeDigest({
      id: 1n,
      withdrawalCredentialsType: 2,
      validatorsBalanceGwei: 33n * GWEI,
      stakeShareLimit: 10_000n,
    });

    const result = calculateShareLimit([maxEb], 1n, 33n * GWEI * WEI_PER_GWEI);

    expect(result.active).toBe(2n);
    expect(result.activeWei).toBe(33n * GWEI * WEI_PER_GWEI);
  });

  it('uses StakingRouter own exited count when it exceeds the module summary', () => {
    const csm = makeDigest({
      id: 3n,
      deposited: 1000n,
      exited: 100n,
      srExited: 150n,
      stakeShareLimit: 10_000n,
    });

    const { active } = calculateShareLimit([csm], 3n, 0n);

    expect(active).toBe(850n); // 1000 - 150, not 1000 - 100
  });

  it('uses the module summary exited count when it exceeds StakingRouter own value', () => {
    const csm = makeDigest({
      id: 3n,
      deposited: 1000n,
      exited: 150n,
      srExited: 100n,
      stakeShareLimit: 10_000n,
    });

    const { active } = calculateShareLimit([csm], 3n, 0n);

    expect(active).toBe(850n); // 1000 - 150, not 1000 - 100
  });

  it('prefers the passed totalModuleStake over the digest validatorsBalanceGwei for a 0x02 module', () => {
    const maxEb = makeDigest({
      id: 1n,
      withdrawalCredentialsType: 2,
      validatorsBalanceGwei: stakeGwei(100_000n),
      stakeShareLimit: 10_000n,
    });

    const live = calculateShareLimit([maxEb], 1n, stakeWei(50_000n));

    expect(live.active).toBe(50_000n);
    expect(live.activeWei).toBe(stakeWei(50_000n));
  });

  it('draws a non-queried 0x02 module stake from its own digest validatorsBalanceGwei, not the passed totalModuleStake', () => {
    const queried = makeDigest({
      id: 3n,
      withdrawalCredentialsType: 2,
      stakeShareLimit: 10_000n, // 100%, so capacity == totalActive
    });
    const other = makeDigest({
      id: 1n,
      withdrawalCredentialsType: 2,
      validatorsBalanceGwei: stakeGwei(100_000n),
    });

    const result = calculateShareLimit([queried, other], 3n, stakeWei(10_000n));

    // capacity = queried(10_000, from totalModuleStake) + other(100_000, from its own digest)
    expect(result.capacity).toBe(110_000n);
  });

  it("does not leak the passed totalModuleStake into another module's contribution to capacity", () => {
    const queried = makeDigest({
      id: 3n,
      withdrawalCredentialsType: 2,
      stakeShareLimit: 10_000n, // 100%, so capacity == totalActive
    });
    const other = makeDigest({
      id: 1n,
      withdrawalCredentialsType: 2,
      validatorsBalanceGwei: stakeGwei(100_000n),
    });

    const withLowStake = calculateShareLimit(
      [queried, other],
      3n,
      stakeWei(10_000n),
    );
    const withHighStake = calculateShareLimit(
      [queried, other],
      3n,
      stakeWei(200_000n),
    );

    // The entire capacity/active delta is attributable to the queried
    // module alone (200_000 - 10_000); none of it leaks into `other`.
    expect(withHighStake.capacity - withLowStake.capacity).toBe(190_000n);
    expect(withHighStake.active - withLowStake.active).toBe(190_000n);
  });

  it('ignores totalModuleStake for a 0x01 module', () => {
    const csm = makeDigest({
      id: 3n,
      deposited: 1000n,
      exited: 100n,
      stakeShareLimit: 1000n,
      depositable: 10n,
    });

    const withZero = calculateShareLimit([csm], 3n, 0n);
    const withNonZero = calculateShareLimit([csm], 3n, stakeWei(50_000n));

    expect(withNonZero).toEqual(withZero);
  });
});
