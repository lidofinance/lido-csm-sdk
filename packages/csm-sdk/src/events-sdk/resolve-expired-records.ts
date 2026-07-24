import { Hex } from 'viem';
import { PenaltyRecord } from './types';

type ExpiryResolvable = {
  type: PenaltyRecord['type'];
  transactionHash: Hex;
};

/**
 * Distills genuine bond-lock expiries out of the raw `type: 'expired'` candidates
 * produced by the legacy `ExpiredBondLockRemoved` and forward `BondLockRemoved`
 * queries.
 *
 * `BondLockRemoved` fires on every full lock removal — expiry, cancel, settle,
 * and compensate — while the cancel/settle/compensate paths always emit their
 * module-level event in the same transaction. A genuine expiry has no such
 * companion, so a candidate is a true expiry iff no cancelled/settled/compensated
 * record shares its `transactionHash`.
 *
 * Legacy and forward candidates that describe the same on-chain expiry (the
 * pre-upgrade contract emitted both `ExpiredBondLockRemoved` and `BondLockRemoved`)
 * are deduped by `transactionHash`. All records must belong to a single operator,
 * so a transaction hash uniquely identifies one expiry.
 *
 * Non-`'expired'` records pass through untouched.
 */
export const resolveExpiredRecords = <T extends ExpiryResolvable>(
  records: T[],
): T[] => {
  const resolvedTxs = new Set(
    records
      .filter(
        (r) =>
          r.type === 'cancelled' ||
          r.type === 'settled' ||
          r.type === 'compensated',
      )
      .map((r) => r.transactionHash),
  );

  const seenExpiryTxs = new Set<Hex>();
  return records.filter((r) => {
    if (r.type !== 'expired') return true;
    if (resolvedTxs.has(r.transactionHash)) return false;
    if (seenExpiryTxs.has(r.transactionHash)) return false;
    seenExpiryTxs.add(r.transactionHash);
    return true;
  });
};
