import { BondSDK } from '../../src/bond-sdk/bond-sdk';
import { ACCESS } from '../../src/common/decorators/access';
import type { MethodAccess } from '../../src/common/decorators/access-types';
import { CuratedGateSDK } from '../../src/curated-gate-sdk/curated-gate-sdk';
import { CuratedGatesCollectionSDK } from '../../src/curated-gates-collection-sdk/curated-gates-collection-sdk';
import { DelayedPenaltySDK } from '../../src/delayed-penalty-sdk/delayed-penalty-sdk';
import { DepositQueueSDK } from '../../src/deposit-queue-sdk/deposit-queue-sdk';
import { KeysSDK } from '../../src/keys-sdk/keys-sdk';
import { MetaRegistrySDK } from '../../src/meta-registry-sdk/meta-registry-sdk';
import { PermissionlessGateSDK } from '../../src/permissionless-gate-sdk/permissionless-gate-sdk';
import { RolesSDK } from '../../src/roles-sdk/roles-sdk';
import { VettedGateSDK } from '../../src/vetted-gate-sdk/vetted-gate-sdk';

export const MODULES = {
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

export const accessMapFromPrototype = (ModuleClass: {
  prototype: object;
}): Record<string, MethodAccess> => {
  const proto = ModuleClass.prototype;
  const result: Record<string, MethodAccess> = {};
  for (const name of Object.getOwnPropertyNames(proto)) {
    // Skip getters — accessing them on the prototype runs the getter with
    // `this === proto`, which crashes because `this.core` is undefined.
    const fn = Object.getOwnPropertyDescriptor(proto, name)?.value;
    if (typeof fn === 'function' && ACCESS in fn) {
      result[name] = (fn as { [ACCESS]: MethodAccess })[ACCESS];
    }
  }
  return result;
};
