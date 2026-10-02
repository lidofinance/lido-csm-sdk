import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  COMMON_ADDRESSES,
  CONTRACT_NAMES,
  ERROR_CODE,
  MODULE_CONFIG,
  MODULE_NAME,
  resolveModuleProfile,
  SDKError,
} from '../../../src/common/index';
import {
  getContractAddresses,
  OverridedAddresses,
  prepareCoreProps,
  resolveChainAddresses,
  resolveDeployment,
} from '../../../src/core-sdk/index';

const chainId = CHAINS.Hoodi;
const A = '0x00000000000000000000000000000000000000a1';
const B = '0x00000000000000000000000000000000000000b2';
const C = '0x00000000000000000000000000000000000000c3';

const addresses = (
  moduleName: MODULE_NAME,
  overridedAddresses?: OverridedAddresses,
) =>
  resolveDeployment({ moduleName, chainId, overridedAddresses })
    .contractAddresses;

describe('resolveDeployment', () => {
  it('merges common and module config without overrides', () => {
    const config = MODULE_CONFIG[MODULE_NAME.CSM][chainId]!;
    expect(addresses(MODULE_NAME.CSM)).toEqual({
      ...COMMON_ADDRESSES[chainId],
      ...config.contractAddresses,
    });
  });

  it.each([
    [MODULE_NAME.CSM, CHAINS.Mainnet],
    [MODULE_NAME.CSM, CHAINS.Hoodi],
    [MODULE_NAME.CM, CHAINS.Hoodi],
    [MODULE_NAME.CSM_02, CHAINS.Hoodi],
  ] as const)('carries config facts for %s on chain %s', (moduleName, id) => {
    const config = MODULE_CONFIG[moduleName][id]!;
    const deployment = resolveDeployment({ moduleName, chainId: id });
    expect(deployment).toMatchObject({
      moduleName,
      chainId: id,
      moduleId: config.moduleId,
      deploymentBlockNumber: config.deploymentBlockNumber,
    });
    expect(deployment.profile).toEqual(resolveModuleProfile(moduleName, id));
  });

  it.each<[string, OverridedAddresses, MODULE_NAME, CONTRACT_NAMES, string]>([
    [
      'flat wins over common',
      { [CONTRACT_NAMES.stETH]: A },
      MODULE_NAME.CSM,
      CONTRACT_NAMES.stETH,
      A,
    ],
    [
      'flat wins over module config',
      { [CONTRACT_NAMES.accounting]: A },
      MODULE_NAME.CSM,
      CONTRACT_NAMES.accounting,
      A,
    ],
    [
      'per-module wins over flat',
      {
        [CONTRACT_NAMES.accounting]: A,
        [MODULE_NAME.CSM]: { [CONTRACT_NAMES.accounting]: B },
      },
      MODULE_NAME.CSM,
      CONTRACT_NAMES.accounting,
      B,
    ],
    [
      'per-module override applies to its module',
      { [MODULE_NAME.CM]: { [CONTRACT_NAMES.feeOracle]: C } },
      MODULE_NAME.CM,
      CONTRACT_NAMES.feeOracle,
      C,
    ],
  ])('%s', (_, overrides, moduleName, key, expected) => {
    expect(addresses(moduleName, overrides)[key]).toBe(expected);
  });

  it('per-module override for another module does not leak', () => {
    const overrides: OverridedAddresses = {
      [MODULE_NAME.CM]: { [CONTRACT_NAMES.accounting]: C },
    };
    expect(addresses(MODULE_NAME.CSM, overrides)).toEqual(
      addresses(MODULE_NAME.CSM),
    );
  });

  it('module keys do not leak into contractAddresses', () => {
    const result = addresses(MODULE_NAME.CSM, {
      [MODULE_NAME.CSM]: { [CONTRACT_NAMES.accounting]: B },
      [MODULE_NAME.CM]: { [CONTRACT_NAMES.accounting]: C },
    });
    for (const name of Object.values(MODULE_NAME)) {
      expect(result).not.toHaveProperty(name);
    }
  });

  it.each([
    ['flat', { [CONTRACT_NAMES.stETH]: undefined }],
    [
      'per-module',
      { [MODULE_NAME.CSM]: { [CONTRACT_NAMES.accounting]: undefined } },
    ],
  ] as [string, OverridedAddresses][])(
    'explicit undefined %s override is unset',
    (_, overrides) => {
      expect(addresses(MODULE_NAME.CSM, overrides)).toEqual(
        addresses(MODULE_NAME.CSM),
      );
    },
  );

  it.each([
    [MODULE_NAME.CSM_02, CHAINS.Mainnet],
    [MODULE_NAME.CSM, 999_999],
  ])('throws NOT_SUPPORTED for %s on chain %s', (moduleName, id) => {
    let error: unknown;
    try {
      resolveDeployment({ moduleName, chainId: id });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(SDKError);
    expect((error as SDKError).code).toBe(ERROR_CODE.NOT_SUPPORTED);
  });

  it('getContractAddresses projects contractAddresses', () => {
    const props = { moduleName: MODULE_NAME.CSM, chainId };
    expect(getContractAddresses(props)).toEqual(
      resolveDeployment(props).contractAddresses,
    );
  });

  it('prepareCoreProps carries deployment facts without raw override fields', () => {
    const core = { chain: { id: chainId } } as any;
    const props = prepareCoreProps(
      { core, overridedAddresses: { [CONTRACT_NAMES.stETH]: A } },
      MODULE_NAME.CSM,
    );
    expect(props.contractAddresses[CONTRACT_NAMES.stETH]).toBe(A);
    expect(props.moduleId).toBe(
      MODULE_CONFIG[MODULE_NAME.CSM][chainId]!.moduleId,
    );
    expect(props.profile).toBeDefined();
    expect(props).not.toHaveProperty('overridedAddresses');
    expect(props).not.toHaveProperty('chainId');
  });

  it('contract and module names are disjoint', () => {
    expectTypeOf<Extract<`${CONTRACT_NAMES}`, `${MODULE_NAME}`>>().toBeNever();
  });

  it('rejects per-module token overrides at the type level', () => {
    const _o: OverridedAddresses = {
      // @ts-expect-error tokens are chain-wide
      [MODULE_NAME.CSM]: { [CONTRACT_NAMES.stETH]: A },
    };
    expect(_o).toBeDefined();
  });
});

describe('resolveChainAddresses', () => {
  it('returns common addresses without overrides', () => {
    expect(resolveChainAddresses({ chainId })).toEqual(
      COMMON_ADDRESSES[chainId],
    );
  });

  it('applies flat overrides on chain-wide keys only', () => {
    const result = resolveChainAddresses({
      chainId,
      overridedAddresses: {
        [CONTRACT_NAMES.stETH]: A,
        [CONTRACT_NAMES.accounting]: B,
        [MODULE_NAME.CSM]: { [CONTRACT_NAMES.accounting]: C },
      },
    });
    expect(result[CONTRACT_NAMES.stETH]).toBe(A);
    expect(result).not.toHaveProperty(CONTRACT_NAMES.accounting);
  });

  it('explicit undefined falls back to common', () => {
    const result = resolveChainAddresses({
      chainId,
      overridedAddresses: { [CONTRACT_NAMES.stETH]: undefined },
    });
    expect(result[CONTRACT_NAMES.stETH]).toBe(
      COMMON_ADDRESSES[chainId][CONTRACT_NAMES.stETH],
    );
  });
});
