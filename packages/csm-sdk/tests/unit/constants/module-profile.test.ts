import { describe, expect, it } from 'vitest';
import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import {
  ALLOCATED_BALANCE_MODULES,
  CONTRACT_NAMES,
  DEPOSIT_QUEUE_MODULES,
  MERKLE_TREE_FALLBACKS,
  MODULE_CONFIG,
  MODULE_CONTRACT,
  MODULE_NAME,
  MODULE_PROFILE,
  SUPPORTED_CONTRACT_VERSIONS,
  TOPUP_QUEUE_MODULES,
} from '../../../src/common/constants/index';

describe('MODULE_PROFILE', () => {
  it('has an entry for every MODULE_NAME', () => {
    for (const name of Object.values(MODULE_NAME)) {
      expect(MODULE_PROFILE[name]).toBeDefined();
    }
  });

  it('moduleContract is configured on every deployed chain', () => {
    for (const name of Object.values(MODULE_NAME)) {
      const { moduleContract } = MODULE_PROFILE[name];
      for (const chainConfig of Object.values(MODULE_CONFIG[name])) {
        expect(chainConfig.contractAddresses[moduleContract]).toMatch(/^0x/);
      }
    }
  });

  it('pins the capability matrix', () => {
    expect(MODULE_PROFILE[MODULE_NAME.CSM]).toMatchObject({
      moduleContract: CONTRACT_NAMES.csModule,
      depositQueue: true,
      topUpQueue: false,
      allocatedBalance: false,
    });
    expect(MODULE_PROFILE[MODULE_NAME.CSM_02]).toMatchObject({
      moduleContract: CONTRACT_NAMES.csModule,
      depositQueue: true,
      topUpQueue: true,
      allocatedBalance: true,
    });
    expect(MODULE_PROFILE[MODULE_NAME.CM]).toMatchObject({
      moduleContract: CONTRACT_NAMES.curatedModule,
      depositQueue: false,
      topUpQueue: false,
      allocatedBalance: true,
    });
  });

  it('every module version-checks its own module contract', () => {
    for (const name of Object.values(MODULE_NAME)) {
      const { moduleContract, contractVersions } = MODULE_PROFILE[name];
      expect(contractVersions[moduleContract]).toBeDefined();
    }
  });

  it('CSM keeps its v1 report log CIDs on both chains', () => {
    const cids = MODULE_PROFILE[MODULE_NAME.CSM].reportV1LogCids;
    expect(cids?.[CHAINS.Mainnet]?.length).toBeGreaterThan(0);
    expect(cids?.[CHAINS.Hoodi]?.length).toBeGreaterThan(0);
    expect(MODULE_PROFILE[MODULE_NAME.CM].reportV1LogCids).toBeUndefined();
  });

  it('deprecated aliases derive from the profile', () => {
    for (const name of Object.values(MODULE_NAME)) {
      const p = MODULE_PROFILE[name];
      expect(MODULE_CONTRACT[name]).toBe(p.moduleContract);
      expect(DEPOSIT_QUEUE_MODULES.has(name)).toBe(p.depositQueue);
      expect(TOPUP_QUEUE_MODULES.has(name)).toBe(p.topUpQueue);
      expect(ALLOCATED_BALANCE_MODULES.has(name)).toBe(p.allocatedBalance);
      expect(MERKLE_TREE_FALLBACKS[name]).toBe(p.merkleTreeFallbacks);
    }
  });

  it('SUPPORTED_CONTRACT_VERSIONS unions every module profile', () => {
    expect(SUPPORTED_CONTRACT_VERSIONS[CONTRACT_NAMES.csModule]).toEqual(
      MODULE_PROFILE[MODULE_NAME.CSM].contractVersions[CONTRACT_NAMES.csModule],
    );
    expect(SUPPORTED_CONTRACT_VERSIONS[CONTRACT_NAMES.curatedModule]).toEqual(
      MODULE_PROFILE[MODULE_NAME.CM].contractVersions[
        CONTRACT_NAMES.curatedModule
      ],
    );
  });
});
