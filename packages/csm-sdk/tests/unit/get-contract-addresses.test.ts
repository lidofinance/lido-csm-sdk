import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it } from 'vitest';
import {
  COMMON_ADDRESSES,
  CONTRACT_NAMES,
  ERROR_CODE,
  MODULE_CONFIG,
  MODULE_NAME,
  SDKError,
} from '../../src/common/index';
import { getContractAddresses } from '../../src/core-sdk/index';

const chainId = CHAINS.Hoodi;
const addr = (n: number) => `0x${n.toString(16).padStart(40, '0')}` as const;

describe('getContractAddresses', () => {
  it('returns common and module addresses for mainnet CSM', () => {
    const result = getContractAddresses({
      moduleName: MODULE_NAME.CSM,
      chainId: CHAINS.Mainnet,
    });
    const module = MODULE_CONFIG[MODULE_NAME.CSM][CHAINS.Mainnet]!;
    expect(result[CONTRACT_NAMES.stakingRouter]).toBe(
      COMMON_ADDRESSES[CHAINS.Mainnet][CONTRACT_NAMES.stakingRouter],
    );
    expect(result[CONTRACT_NAMES.csModule]).toBe(
      module.contractAddresses[CONTRACT_NAMES.csModule],
    );
    expect(result[CONTRACT_NAMES.accounting]).toBe(
      module.contractAddresses[CONTRACT_NAMES.accounting],
    );
  });

  it('module config wins over common', () => {
    const module = MODULE_CONFIG[MODULE_NAME.CSM][chainId]!;
    const result = getContractAddresses({
      moduleName: MODULE_NAME.CSM,
      chainId,
    });
    expect(result).toEqual({
      ...COMMON_ADDRESSES[chainId],
      ...module.contractAddresses,
    });
  });

  it('flat override wins over module config', () => {
    const result = getContractAddresses({
      moduleName: MODULE_NAME.CSM,
      chainId,
      overridedAddresses: { [CONTRACT_NAMES.accounting]: addr(1) },
    });
    expect(result[CONTRACT_NAMES.accounting]).toBe(addr(1));
  });

  it('per-module override wins over flat override', () => {
    const result = getContractAddresses({
      moduleName: MODULE_NAME.CSM,
      chainId,
      overridedAddresses: {
        [CONTRACT_NAMES.accounting]: addr(1),
        [MODULE_NAME.CSM]: { [CONTRACT_NAMES.accounting]: addr(2) },
      },
    });
    expect(result[CONTRACT_NAMES.accounting]).toBe(addr(2));
  });

  it('per-module override for another module does not leak', () => {
    const base = getContractAddresses({ moduleName: MODULE_NAME.CSM, chainId });
    const result = getContractAddresses({
      moduleName: MODULE_NAME.CSM,
      chainId,
      overridedAddresses: {
        [MODULE_NAME.CM]: { [CONTRACT_NAMES.accounting]: addr(3) },
      },
    });
    expect(result).toEqual(base);
  });

  it.each([
    [MODULE_NAME.CSM_02, CHAINS.Mainnet],
    [MODULE_NAME.CSM, 999_999],
  ])('throws NOT_SUPPORTED for %s on chain %s', (moduleName, id) => {
    let error: unknown;
    try {
      getContractAddresses({ moduleName, chainId: id });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(SDKError);
    expect((error as SDKError).code).toBe(ERROR_CODE.NOT_SUPPORTED);
  });
});
