import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it } from 'vitest';
import {
  getDeployedModules,
  isDeployedModule,
} from '../../src/common/constants/module-config';
import {
  MODULE_NAME,
  SUPPORTED_MODULES,
} from '../../src/common/constants/module-name';

describe('deployed modules', () => {
  it('SUPPORTED_MODULES is in canonical order', () => {
    expect(SUPPORTED_MODULES).toEqual([
      MODULE_NAME.CSM,
      MODULE_NAME.CSM_02,
      MODULE_NAME.CM,
    ]);
  });

  it('getDeployedModules follows SUPPORTED_MODULES order per chain', () => {
    expect(getDeployedModules(CHAINS.Mainnet)).toEqual([
      MODULE_NAME.CSM,
      MODULE_NAME.CM,
    ]);
    expect(getDeployedModules(CHAINS.Hoodi)).toEqual([
      MODULE_NAME.CSM,
      MODULE_NAME.CSM_02,
      MODULE_NAME.CM,
    ]);
  });

  it('getDeployedModules returns [] for an unknown chain', () => {
    expect(getDeployedModules(1337)).toEqual([]);
  });

  it('isDeployedModule reflects MODULE_CONFIG', () => {
    expect(isDeployedModule(MODULE_NAME.CSM_02, CHAINS.Hoodi)).toBe(true);
    expect(isDeployedModule(MODULE_NAME.CSM_02, CHAINS.Mainnet)).toBe(false);
    expect(isDeployedModule(MODULE_NAME.CM, 1337)).toBe(false);
  });
});
