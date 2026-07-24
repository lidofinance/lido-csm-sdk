import { describe, it, expect } from 'vitest';
import type { Address } from 'viem';
import { ROLES } from '../../../src/common/constants/roles';
import {
  packRoles,
  mergeRoles,
  isNotEmptyRoles,
} from '../../../src/events-sdk/merge';
import {
  reconstructOperators,
  type NodeOperatorLog,
} from '../../../src/events-sdk/reconstruct-operators';
import {
  reconstructInvites,
  type ChangeAddressLog,
} from '../../../src/events-sdk/reconstruct-invites';
import { resolveExpiredRecords } from '../../../src/events-sdk/resolve-expired-records';
import type { PenaltyRecord } from '../../../src/events-sdk/types';

const ADDR_A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;
const ADDR_B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address;

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

describe('mergeRoles', () => {
  it('adds new operator to empty list', () => {
    const result = mergeRoles([], 1n, { [ROLES.MANAGER]: true });
    expect(result).toEqual([{ id: 1n, roles: [ROLES.MANAGER] }]);
  });

  it('updates existing operator roles', () => {
    const list = [{ id: 1n, roles: [ROLES.MANAGER] }];
    const result = mergeRoles(list, 1n, { [ROLES.REWARDS]: true });
    expect(result).toEqual([{ id: 1n, roles: [ROLES.REWARDS, ROLES.MANAGER] }]);
  });

  it('removes role when set to false', () => {
    const list = [{ id: 1n, roles: [ROLES.REWARDS, ROLES.MANAGER] }];
    const result = mergeRoles(list, 1n, { [ROLES.MANAGER]: false });
    expect(result).toEqual([{ id: 1n, roles: [ROLES.REWARDS] }]);
  });

  it('preserves other operators', () => {
    const list = [
      { id: 1n, roles: [ROLES.MANAGER] },
      { id: 2n, roles: [ROLES.REWARDS] },
    ];
    const result = mergeRoles(list, 1n, { [ROLES.REWARDS]: true });
    expect(result[1]).toEqual({ id: 2n, roles: [ROLES.REWARDS] });
  });
});

describe('isNotEmptyRoles', () => {
  it('returns true for operator with roles', () => {
    expect(isNotEmptyRoles({ id: 1n, roles: [ROLES.MANAGER] })).toBe(true);
  });

  it('returns false for operator with no roles', () => {
    expect(isNotEmptyRoles({ id: 1n, roles: [] })).toBe(false);
  });
});

describe('reconstructOperators', () => {
  it('builds operators from NodeOperatorAdded events', () => {
    const logs: NodeOperatorLog[] = [
      {
        blockNumber: 1n,
        eventName: 'NodeOperatorAdded',
        args: {
          nodeOperatorId: 0n,
          managerAddress: ADDR_A,
          rewardAddress: ADDR_A,
        },
      },
    ];
    const result = reconstructOperators(logs, ADDR_A);
    expect(result).toEqual([{ id: 0n, roles: [ROLES.REWARDS, ROLES.MANAGER] }]);
  });

  it('handles manager address change', () => {
    const logs: NodeOperatorLog[] = [
      {
        blockNumber: 1n,
        eventName: 'NodeOperatorAdded',
        args: {
          nodeOperatorId: 0n,
          managerAddress: ADDR_A,
          rewardAddress: ADDR_A,
        },
      },
      {
        blockNumber: 2n,
        eventName: 'NodeOperatorManagerAddressChanged',
        args: { nodeOperatorId: 0n, newAddress: ADDR_B },
      },
    ];
    const result = reconstructOperators(logs, ADDR_A);
    expect(result).toEqual([{ id: 0n, roles: [ROLES.REWARDS] }]);
  });

  it('filters out operators with no roles', () => {
    const logs: NodeOperatorLog[] = [
      {
        blockNumber: 1n,
        eventName: 'NodeOperatorAdded',
        args: {
          nodeOperatorId: 0n,
          managerAddress: ADDR_A,
          rewardAddress: ADDR_B,
        },
      },
      {
        blockNumber: 2n,
        eventName: 'NodeOperatorManagerAddressChanged',
        args: { nodeOperatorId: 0n, newAddress: ADDR_B },
      },
    ];
    const result = reconstructOperators(logs, ADDR_A);
    expect(result).toEqual([]);
  });

  it('skips events without nodeOperatorId', () => {
    const logs: NodeOperatorLog[] = [
      { blockNumber: 1n, eventName: 'NodeOperatorAdded', args: {} },
    ];
    const result = reconstructOperators(logs, ADDR_A);
    expect(result).toEqual([]);
  });

  it('skips unknown event names', () => {
    const logs: NodeOperatorLog[] = [
      {
        blockNumber: 1n,
        eventName: 'UnknownEvent',
        args: { nodeOperatorId: 0n },
      },
    ];
    const result = reconstructOperators(logs, ADDR_A);
    expect(result).toEqual([]);
  });
});

describe('reconstructInvites', () => {
  it('creates invite from proposed manager change', () => {
    const logs: ChangeAddressLog[] = [
      {
        blockNumber: 1n,
        eventName: 'NodeOperatorManagerAddressChangeProposed',
        args: { nodeOperatorId: 0n, newProposedAddress: ADDR_A },
      },
    ];
    const result = reconstructInvites(logs, ADDR_A);
    expect(result).toEqual([{ id: 0n, role: ROLES.MANAGER }]);
  });

  it('creates invite from proposed rewards change', () => {
    const logs: ChangeAddressLog[] = [
      {
        blockNumber: 1n,
        eventName: 'NodeOperatorRewardAddressChangeProposed',
        args: { nodeOperatorId: 0n, newProposedAddress: ADDR_A },
      },
    ];
    const result = reconstructInvites(logs, ADDR_A);
    expect(result).toEqual([{ id: 0n, role: ROLES.REWARDS }]);
  });

  it('removes invite when proposal is for different address', () => {
    const logs: ChangeAddressLog[] = [
      {
        blockNumber: 1n,
        eventName: 'NodeOperatorManagerAddressChangeProposed',
        args: { nodeOperatorId: 0n, newProposedAddress: ADDR_A },
      },
      {
        blockNumber: 2n,
        eventName: 'NodeOperatorManagerAddressChangeProposed',
        args: { nodeOperatorId: 0n, newProposedAddress: ADDR_B },
      },
    ];
    const result = reconstructInvites(logs, ADDR_A);
    expect(result).toEqual([]);
  });

  it('removes invite when address change is confirmed', () => {
    const logs: ChangeAddressLog[] = [
      {
        blockNumber: 1n,
        eventName: 'NodeOperatorManagerAddressChangeProposed',
        args: { nodeOperatorId: 0n, newProposedAddress: ADDR_A },
      },
      {
        blockNumber: 2n,
        eventName: 'NodeOperatorManagerAddressChanged',
        args: { nodeOperatorId: 0n, newAddress: ADDR_A },
      },
    ];
    const result = reconstructInvites(logs, ADDR_A);
    expect(result).toEqual([]);
  });

  it('sorts by id then role', () => {
    const logs: ChangeAddressLog[] = [
      {
        blockNumber: 1n,
        eventName: 'NodeOperatorManagerAddressChangeProposed',
        args: { nodeOperatorId: 1n, newProposedAddress: ADDR_A },
      },
      {
        blockNumber: 2n,
        eventName: 'NodeOperatorRewardAddressChangeProposed',
        args: { nodeOperatorId: 0n, newProposedAddress: ADDR_A },
      },
    ];
    const result = reconstructInvites(logs, ADDR_A);
    expect(result[0]?.id).toBe(0n);
    expect(result[1]?.id).toBe(1n);
  });

  it('skips events without nodeOperatorId', () => {
    const logs: ChangeAddressLog[] = [
      {
        blockNumber: 1n,
        eventName: 'NodeOperatorManagerAddressChangeProposed',
        args: {},
      },
    ];
    const result = reconstructInvites(logs, ADDR_A);
    expect(result).toEqual([]);
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
