import { describe, it, expect } from 'vitest';
import {
  CONTRACT_NAMES,
  CURATED_GATES,
  MERKLE_TREE_FALLBACKS,
  MODULE_NAME,
} from '../../../src/common/constants/index';

// Contracts that may legitimately appear in each module's fallback map.
// Guards against reintroducing cross-module keys (e.g. a CM gate in the CSM
// map, or a shared feeDistributor entry serving the wrong module's tree).
const ALLOWED_KEYS: Record<MODULE_NAME, ReadonlySet<string>> = {
  [MODULE_NAME.CSM]: new Set([
    CONTRACT_NAMES.icsGate,
    CONTRACT_NAMES.idvtcGate,
    CONTRACT_NAMES.feeDistributor,
  ]),
  [MODULE_NAME.CM]: new Set([...CURATED_GATES, CONTRACT_NAMES.feeDistributor]),
};

describe('MERKLE_TREE_FALLBACKS', () => {
  Object.values(MODULE_NAME).forEach((moduleName) => {
    it(`${moduleName} maps contain only ${moduleName}-relevant contracts`, () => {
      const perChain = MERKLE_TREE_FALLBACKS[moduleName];
      Object.entries(perChain).forEach(([chainId, fallbacks]) => {
        Object.keys(fallbacks).forEach((contractName) => {
          expect(
            ALLOWED_KEYS[moduleName].has(contractName),
            `unexpected key [${contractName}] in ${moduleName} fallbacks on chain ${chainId}`,
          ).toBe(true);
        });
      });
    });
  });

  it('all fallback URLs are absolute https URLs', () => {
    Object.values(MERKLE_TREE_FALLBACKS).forEach((perChain) => {
      Object.values(perChain).forEach((fallbacks) => {
        Object.values(fallbacks).forEach((url) => {
          expect(url).toMatch(/^https:\/\//);
        });
      });
    });
  });
});
