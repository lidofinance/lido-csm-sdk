import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, it, expect } from 'vitest';
import {
  CONTRACT_NAMES,
  CURATED_GATES,
  MODULE_NAME,
  MODULE_PROFILE,
  resolveModuleProfile,
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
  [MODULE_NAME.CSM_02]: new Set([CONTRACT_NAMES.feeDistributor]),
};

describe('MODULE_PROFILE.merkleTreeFallbacks', () => {
  Object.values(MODULE_NAME).forEach((moduleName) => {
    it(`${moduleName} maps contain only ${moduleName}-relevant contracts`, () => {
      const perChain = MODULE_PROFILE[moduleName].merkleTreeFallbacks;
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
    Object.values(MODULE_PROFILE)
      .map((p) => p.merkleTreeFallbacks)
      .forEach((perChain) => {
        Object.values(perChain).forEach((fallbacks) => {
          Object.values(fallbacks).forEach((url) => {
            expect(url).toMatch(/^https:\/\//);
          });
        });
      });
  });
});

describe('resolveModuleProfile', () => {
  it('picks the requested chain', () => {
    const profile = resolveModuleProfile(MODULE_NAME.CSM, CHAINS.Mainnet);
    expect(profile.merkleTreeFallbacks).toBe(
      MODULE_PROFILE[MODULE_NAME.CSM].merkleTreeFallbacks[CHAINS.Mainnet],
    );
  });

  it('defaults reportV1LogCids to [] for CSM_02', () => {
    const profile = resolveModuleProfile(MODULE_NAME.CSM_02, CHAINS.Hoodi);
    expect(profile.reportV1LogCids).toEqual([]);
  });
});
