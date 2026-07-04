// Legacy Accounting events removed from the current contract ABI but still
// present in historical logs from the pre-upgrade contract.
//
// `ExpiredBondLockRemoved` was dropped as "redundant" (staking-modules
// #805) because `_unlockExpiredLock` already emits `BondLockRemoved` via
// `_changeBondLock`. Historical logs emitted before that upgrade still carry it,
// so this ABI is kept to parse the expiry signal across the upgrade boundary.
// See EventsSDK.getPenalties for how it is combined with `BondLockRemoved`.
export const AccountingV1EventsAbi = [
  {
    type: 'event',
    name: 'ExpiredBondLockRemoved',
    inputs: [
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
] as const;
