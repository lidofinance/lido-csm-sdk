import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  COMMON_ADDRESSES,
  CONTRACT_NAMES,
  MODULE_CONFIG,
  MODULE_NAME,
} from '../../../src/common/index';
import { OverridedAddresses } from '../../../src/core-sdk/types';
import { prepareCoreProps } from '../../../src/core-sdk/prepare-core-props';

const core = { chain: { id: CHAINS.Hoodi } } as any;
const A = '0x00000000000000000000000000000000000000a1';
const B = '0x00000000000000000000000000000000000000b2';
const C = '0x00000000000000000000000000000000000000c3';

const addresses = (
  moduleName: MODULE_NAME,
  overridedAddresses?: OverridedAddresses,
) =>
  prepareCoreProps({ core, overridedAddresses }, moduleName).contractAddresses;

describe('prepareCoreProps overridedAddresses', () => {
  it('keeps common and module config addresses without overrides', () => {
    const result = addresses(MODULE_NAME.CSM);
    expect(result[CONTRACT_NAMES.stETH]).toBe(
      COMMON_ADDRESSES[CHAINS.Hoodi][CONTRACT_NAMES.stETH],
    );
    expect(result[CONTRACT_NAMES.accounting]).toBe(
      MODULE_CONFIG[MODULE_NAME.CSM][CHAINS.Hoodi]!.contractAddresses[
        CONTRACT_NAMES.accounting
      ],
    );
  });

  it('flat overrides win over common and config', () => {
    const result = addresses(MODULE_NAME.CSM, {
      [CONTRACT_NAMES.stETH]: A,
      [CONTRACT_NAMES.accounting]: A,
    });
    expect(result[CONTRACT_NAMES.stETH]).toBe(A);
    expect(result[CONTRACT_NAMES.accounting]).toBe(A);
  });

  it('per-module overrides win over flat', () => {
    const result = addresses(MODULE_NAME.CSM, {
      [CONTRACT_NAMES.accounting]: A,
      [MODULE_NAME.CSM]: { [CONTRACT_NAMES.accounting]: B },
    });
    expect(result[CONTRACT_NAMES.accounting]).toBe(B);
  });

  it('per-module override for CSM does not affect CM', () => {
    const overrides: OverridedAddresses = {
      [CONTRACT_NAMES.stETH]: A,
      [MODULE_NAME.CSM]: { [CONTRACT_NAMES.accounting]: B },
      [MODULE_NAME.CM]: { [CONTRACT_NAMES.feeOracle]: C },
    };
    const cm = addresses(MODULE_NAME.CM, overrides);
    expect(cm[CONTRACT_NAMES.accounting]).toBe(
      MODULE_CONFIG[MODULE_NAME.CM][CHAINS.Hoodi]!.contractAddresses[
        CONTRACT_NAMES.accounting
      ],
    );
    expect(cm[CONTRACT_NAMES.feeOracle]).toBe(C);
    expect(cm[CONTRACT_NAMES.stETH]).toBe(A);
    expect(
      addresses(MODULE_NAME.CSM, overrides)[CONTRACT_NAMES.feeOracle],
    ).not.toBe(C);
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
