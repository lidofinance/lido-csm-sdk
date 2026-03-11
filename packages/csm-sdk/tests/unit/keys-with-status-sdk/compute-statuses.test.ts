import { describe, it, expect } from 'vitest';
import type { Hex } from 'viem';
import { KEY_STATUS } from '../../../src/common/constants/keys.js';
import { computeStatuses } from '../../../src/keys-with-status-sdk/compute-statuses.js';
import type {
  StatusContext,
  ClPreparedKey,
} from '../../../src/keys-with-status-sdk/types.js';

const PUBKEY = '0xaabbccdd' as Hex;

const makeContext = (
  overrides: Partial<StatusContext> = {},
): StatusContext => ({
  pubkey: PUBKEY,
  keyIndex: 0,
  info: {
    totalAddedKeys: 10,
    totalWithdrawnKeys: 0,
    totalDepositedKeys: 5,
    totalVettedKeys: 8,
    stuckValidatorsCount: 0,
    depositableValidatorsCount: 3,
    targetLimit: 0,
    targetLimitMode: 0,
    totalExitedKeys: 0,
    enqueuedCount: 3,
    managerAddress: '0x0000000000000000000000000000000000000001',
    rewardsAddress: '0x0000000000000000000000000000000000000002',
    extendedManagerPermissions: false,
    usedPriorityQueue: false,
  },
  ejectableEpoch: 1000n,
  unboundCount: 0,
  duplicates: null,
  withdrawalSubmitted: null,
  requestedToExit: [],
  hasCLStatuses: true,
  hasStrikes: false,
  ...overrides,
});

describe('computeStatuses', () => {
  describe('unvetted keys', () => {
    it('returns UNCHECKED for key beyond vetted range', () => {
      // keyIndex=9, totalVettedKeys=8 → unvetted, not at boundary
      const ctx = makeContext({ keyIndex: 9 });
      expect(computeStatuses(ctx)).toEqual([KEY_STATUS.UNCHECKED]);
    });

    it('returns INVALID for key at vetted boundary', () => {
      // keyIndex=8 === totalVettedKeys=8 → invalid (first unvetted)
      const ctx = makeContext({ keyIndex: 8 });
      expect(computeStatuses(ctx)).toEqual([KEY_STATUS.INVALID]);
    });

    it('returns DUPLICATED for key in duplicates list', () => {
      const ctx = makeContext({ keyIndex: 9, duplicates: [PUBKEY] });
      expect(computeStatuses(ctx)).toEqual([KEY_STATUS.DUPLICATED]);
    });

    it('returns DUPLICATED when prefilled has status', () => {
      const ctx = makeContext({
        keyIndex: 9,
        prefilled: { status: KEY_STATUS.ACTIVE } as ClPreparedKey,
      });
      expect(computeStatuses(ctx)).toEqual([KEY_STATUS.DUPLICATED]);
    });
  });

  describe('vetted keys (not deposited)', () => {
    it('returns DEPOSITABLE when enqueuedCount >= depositableValidatorsCount', () => {
      // keyIndex=6 → vetted (< 8) but not deposited (>= 5)
      const ctx = makeContext({
        keyIndex: 6,
        info: {
          ...makeContext().info,
          enqueuedCount: 3,
          depositableValidatorsCount: 3,
        },
      });
      expect(computeStatuses(ctx)).toEqual([KEY_STATUS.DEPOSITABLE]);
    });

    it('returns NON_QUEUED when enqueuedCount < depositableValidatorsCount', () => {
      // keyIndex=6 → vetted (< 8) but not deposited (>= 5)
      const ctx = makeContext({
        keyIndex: 6,
        info: {
          ...makeContext().info,
          enqueuedCount: 1,
          depositableValidatorsCount: 3,
        },
      });
      expect(computeStatuses(ctx)).toEqual([KEY_STATUS.NON_QUEUED]);
    });
  });

  describe('deposited keys', () => {
    it('returns ACTIVE with CL statuses and no prefilled', () => {
      // keyIndex=2 → deposited (< 5)
      const ctx = makeContext({ keyIndex: 2, hasCLStatuses: true });
      expect(computeStatuses(ctx)).toContain(KEY_STATUS.ACTIVATION_PENDING);
    });

    it('returns ACTIVE when no CL statuses available', () => {
      const ctx = makeContext({ keyIndex: 2, hasCLStatuses: false });
      expect(computeStatuses(ctx)).toContain(KEY_STATUS.ACTIVE);
    });

    it('returns prefilled status when available', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.ACTIVE,
          slashed: false,
        } as ClPreparedKey,
      });
      expect(computeStatuses(ctx)).toContain(KEY_STATUS.ACTIVE);
    });

    it('returns WITHDRAWN for submitted withdrawal', () => {
      const ctx = makeContext({
        keyIndex: 2,
        withdrawalSubmitted: [PUBKEY],
      });
      expect(computeStatuses(ctx)).toEqual([KEY_STATUS.WITHDRAWN]);
    });
  });

  describe('additional statuses', () => {
    it('adds SLASHED for slashed deposited key', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.ACTIVE,
          slashed: true,
        } as ClPreparedKey,
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).toContain(KEY_STATUS.ACTIVE);
      expect(statuses).toContain(KEY_STATUS.SLASHED);
    });

    it('adds EXIT_REQUESTED when key is in requested list', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.ACTIVE,
          slashed: false,
        } as ClPreparedKey,
        requestedToExit: [PUBKEY],
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).toContain(KEY_STATUS.EXIT_REQUESTED);
    });

    it('does not add EXIT_REQUESTED when slashed', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.ACTIVE,
          slashed: true,
        } as ClPreparedKey,
        requestedToExit: [PUBKEY],
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).not.toContain(KEY_STATUS.EXIT_REQUESTED);
    });

    it('adds EJECTABLE for active key with old activation epoch', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.ACTIVE,
          slashed: false,
          activationEpoch: 100n,
        } as ClPreparedKey,
        ejectableEpoch: 1000n,
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).toContain(KEY_STATUS.EJECTABLE);
    });

    it('adds EJECTABLE when no CL statuses', () => {
      const ctx = makeContext({
        keyIndex: 2,
        hasCLStatuses: false,
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).toContain(KEY_STATUS.EJECTABLE);
    });

    it('does not add EJECTABLE when slashed', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.ACTIVE,
          slashed: true,
          activationEpoch: 100n,
        } as ClPreparedKey,
        ejectableEpoch: 1000n,
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).not.toContain(KEY_STATUS.EJECTABLE);
    });

    it('adds WITH_STRIKES when hasStrikes is true', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.ACTIVE,
          slashed: false,
        } as ClPreparedKey,
        hasStrikes: true,
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).toContain(KEY_STATUS.WITH_STRIKES);
    });

    it('adds UNBONDED when key is in unbonded tail', () => {
      const ctx = makeContext({
        keyIndex: 8, // totalAddedKeys=10, unboundCount=3 → 10-8=2 < 3
        unboundCount: 3,
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).toContain(KEY_STATUS.UNBONDED);
    });

    it('does not add UNBONDED when key is outside tail', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.ACTIVE,
          slashed: false,
        } as ClPreparedKey,
        unboundCount: 1,
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).not.toContain(KEY_STATUS.UNBONDED);
    });
  });

  describe('suppressed additional statuses', () => {
    it('suppresses additional statuses for WITHDRAWN lifecycle', () => {
      const ctx = makeContext({
        keyIndex: 2,
        withdrawalSubmitted: [PUBKEY],
        hasStrikes: true,
        requestedToExit: [PUBKEY],
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).toEqual([KEY_STATUS.WITHDRAWN]);
    });

    it('suppresses additional statuses for EXITING lifecycle', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.EXITING,
          slashed: false,
        } as ClPreparedKey,
        hasStrikes: true,
        requestedToExit: [PUBKEY],
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).toEqual([KEY_STATUS.EXITING]);
    });

    it('suppresses additional statuses for WITHDRAWAL_PENDING lifecycle', () => {
      const ctx = makeContext({
        keyIndex: 2,
        prefilled: {
          status: KEY_STATUS.WITHDRAWAL_PENDING,
          slashed: false,
        } as ClPreparedKey,
        hasStrikes: true,
      });
      const statuses = computeStatuses(ctx);
      expect(statuses).toEqual([KEY_STATUS.WITHDRAWAL_PENDING]);
    });
  });
});
