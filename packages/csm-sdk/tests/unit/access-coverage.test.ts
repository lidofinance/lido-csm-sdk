import { describe, expect, it } from 'vitest';
import { ACCESS } from '../../src/common/decorators/access';
import type { MethodAccess } from '../../src/common/decorators/access-types';
import { BondSDK } from '../../src/bond-sdk/bond-sdk';
import { CuratedGateSDK } from '../../src/curated-gate-sdk/curated-gate-sdk';
import { CuratedGatesCollectionSDK } from '../../src/curated-gates-collection-sdk/curated-gates-collection-sdk';
import { DelayedPenaltySDK } from '../../src/delayed-penalty-sdk/delayed-penalty-sdk';
import { DepositQueueSDK } from '../../src/deposit-queue-sdk/deposit-queue-sdk';
import { KeysSDK } from '../../src/keys-sdk/keys-sdk';
import { MetaRegistrySDK } from '../../src/meta-registry-sdk/meta-registry-sdk';
import { PermissionlessGateSDK } from '../../src/permissionless-gate-sdk/permissionless-gate-sdk';
import { RolesSDK } from '../../src/roles-sdk/roles-sdk';
import { VettedGateSDK } from '../../src/vetted-gate-sdk/vetted-gate-sdk';

// Snapshot pins the @Access surface across all SDK modules.
// Any add/remove/change shows up as a snapshot diff in review.
// Refresh deliberately via `yarn test -u` after intentional contract changes.

const accessMapFromPrototype = (
  ModuleClass: new (...args: never[]) => unknown,
): Record<string, MethodAccess> => {
  const proto = ModuleClass.prototype as object;
  const result: Record<string, MethodAccess> = {};
  for (const name of Object.getOwnPropertyNames(proto)) {
    // Skip getters — accessing them on the prototype runs the getter with
    // `this === proto`, which crashes because `this.core` is undefined.
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    const fn = descriptor?.value;
    if (typeof fn === 'function' && ACCESS in fn) {
      result[name] = (fn as { [ACCESS]: MethodAccess })[ACCESS];
    }
  }
  return result;
};

const MODULES = {
  BondSDK,
  CuratedGateSDK,
  CuratedGatesCollectionSDK,
  DelayedPenaltySDK,
  DepositQueueSDK,
  KeysSDK,
  MetaRegistrySDK,
  PermissionlessGateSDK,
  RolesSDK,
  VettedGateSDK,
} as const;

describe('SDK @Access coverage', () => {
  it('annotated methods across all SDK modules match snapshot', () => {
    const map: Record<string, Record<string, MethodAccess>> = {};
    for (const [name, ModuleClass] of Object.entries(MODULES)) {
      const access = accessMapFromPrototype(ModuleClass);
      if (Object.keys(access).length > 0) map[name] = access;
    }
    expect(map).toMatchSnapshot();
  });
});
