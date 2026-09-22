import { describe, it, expect } from 'vitest';
import { ROLES } from '../../../src/common/constants/roles';
import { packRoles } from '../../../src/events-sdk/get-node-operator-roles';
import { resolveExpiredRecords } from '../../../src/events-sdk/resolve-expired-records';
import type { PenaltyRecord } from '../../../src/events-sdk/types';

describe('packRoles', () => {
  it('returns roles with truthy values', () => {
    expect(
      packRoles({ [ROLES.MANAGER]: true, [ROLES.REWARDS]: false }),
    ).toEqual([ROLES.MANAGER]);
  });

  it('returns both roles when both true', () => {
    const result = packRoles({ [ROLES.MANAGER]: true, [ROLES.REWARDS]: true });
    expect(result).toContain(ROLES.REWARDS);
    expect(result).toContain(ROLES.MANAGER);
    expect(result).toHaveLength(2);
  });

  it('returns empty for all false', () => {
    expect(
      packRoles({ [ROLES.MANAGER]: false, [ROLES.REWARDS]: false }),
    ).toEqual([]);
  });

  it('returns empty for empty patch', () => {
    expect(packRoles({})).toEqual([]);
  });
});

describe('resolveExpiredRecords', () => {
  type Rec = Pick<PenaltyRecord, 'type' | 'transactionHash'>;
  const rec = (type: PenaltyRecord['type'], tx: string): Rec => ({
    type,
    transactionHash: tx as Rec['transactionHash'],
  });

  it('keeps a lone expiry with no companion in the same tx', () => {
    const records = [rec('expired', '0x01')];
    expect(resolveExpiredRecords(records)).toEqual(records);
  });

  it.each(['cancelled', 'settled', 'compensated'] as const)(
    'prunes an expiry sharing a tx with a %s record (full removal, not expiry)',
    (companion) => {
      const records = [rec(companion, '0x01'), rec('expired', '0x01')];
      expect(resolveExpiredRecords(records)).toEqual([rec(companion, '0x01')]);
    },
  );

  it('dedupes legacy + forward candidates describing the same expiry', () => {
    // pre-upgrade contract emitted both ExpiredBondLockRemoved and BondLockRemoved
    const records = [rec('expired', '0x01'), rec('expired', '0x01')];
    expect(resolveExpiredRecords(records)).toEqual([rec('expired', '0x01')]);
  });

  it('keeps distinct expiries in different transactions', () => {
    const records = [rec('expired', '0x01'), rec('expired', '0x02')];
    expect(resolveExpiredRecords(records)).toEqual(records);
  });

  it('leaves non-expired records untouched', () => {
    const records = [
      rec('reported', '0x01'),
      rec('cancelled', '0x02'),
      rec('settled', '0x03'),
      rec('compensated', '0x04'),
    ];
    expect(resolveExpiredRecords(records)).toEqual(records);
  });

  it('resolves a realistic mixed history', () => {
    const records = [
      rec('reported', '0xa1'), // penalty reported
      rec('settled', '0xb2'), // settled in 0xb2 ...
      rec('expired', '0xb2'), // ... same tx removed the lock -> not an expiry
      rec('expired', '0xc3'), // legacy expiry
      rec('expired', '0xc3'), // forward duplicate of the same expiry
      rec('compensated', '0xd4'),
      rec('expired', '0xd4'), // compensation removal -> not an expiry
      rec('expired', '0xe5'), // genuine standalone expiry
    ];
    expect(resolveExpiredRecords(records)).toEqual([
      rec('reported', '0xa1'),
      rec('settled', '0xb2'),
      rec('expired', '0xc3'),
      rec('compensated', '0xd4'),
      rec('expired', '0xe5'),
    ]);
  });

  it('returns empty for empty input', () => {
    expect(resolveExpiredRecords([])).toEqual([]);
  });
});
