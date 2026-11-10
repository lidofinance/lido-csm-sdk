import { describe, expect, it } from 'vitest';
import { accessMapFromPrototype, MODULES } from './sdk-modules';

// Per-token variants are covered by the token-dispatching estimate sibling.
const TOKEN_VARIANTS = ['ETH', 'StETH', 'WstETH'];
const ESTIMATE_ALIAS: Record<string, string> = {
  ...Object.fromEntries(
    TOKEN_VARIANTS.flatMap((token) => [
      [`BondSDK.addBond${token}`, 'estimateAddBond'],
      [`KeysSDK.addKeys${token}`, 'estimateAddKeys'],
      [
        `PermissionlessGateSDK.addNodeOperator${token}`,
        'estimateAddNodeOperator',
      ],
      [`VettedGateSDK.addNodeOperator${token}`, 'estimateAddNodeOperator'],
    ]),
  ),
  ...Object.fromEntries(
    ['UnstETH', 'StETH', 'WstETH'].map((token) => [
      `BondSDK.claimBond${token}`,
      'estimateClaimBond',
    ]),
  ),
};

const estimateName = (method: string) =>
  `estimate${method[0]!.toUpperCase()}${method.slice(1)}`;

describe('estimate* coverage', () => {
  it.each(Object.entries(MODULES))(
    '%s: every @Access write has an estimate sibling',
    (className, ModuleClass) => {
      const proto = ModuleClass.prototype as unknown as Record<string, unknown>;
      const missing = Object.keys(accessMapFromPrototype(ModuleClass)).filter(
        (method) => {
          const sibling =
            ESTIMATE_ALIAS[`${className}.${method}`] ?? estimateName(method);
          return typeof proto[sibling] !== 'function';
        },
      );
      expect(missing).toEqual([]);
    },
  );
});
