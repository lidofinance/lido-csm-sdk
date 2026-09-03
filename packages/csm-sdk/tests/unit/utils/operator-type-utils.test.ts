import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  getCurveIdByOperatorType,
  getCurveRefByOperatorType,
  getOperatorTypeByCurveId,
  getOperatorTypesForModule,
} from '../../../src/common/utils/operator-type-utils';
import {
  CurveRef,
  OPERATOR_TYPE,
} from '../../../src/common/constants/operator-types';
import { MODULE_NAME } from '../../../src/common/constants/module-name';
import { SUPPORTED_CHAINS } from '../../../src/common/constants/supported-chains';

describe('getCurveIdByOperatorType', () => {
  it('returns correct curve ID for CSM types', () => {
    expect(getCurveIdByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CSM_DEF)).toBe(
      0n,
    );
    expect(getCurveIdByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CSM_LEA)).toBe(
      1n,
    );
    expect(getCurveIdByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CSM_ICS)).toBe(
      2n,
    );
  });

  it('returns correct curve ID for CM types', () => {
    expect(getCurveIdByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CM_PO)).toBe(
      0n,
    );
    expect(getCurveIdByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CM_PTO)).toBe(
      1n,
    );
  });

  it('is chain-specific: same operator type maps to different curve ids', () => {
    expect(
      getCurveIdByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CSM_IDVTC),
    ).toBe(4n);
    expect(
      getCurveIdByOperatorType(CHAINS.Mainnet, OPERATOR_TYPE.CSM_IDVTC),
    ).toBe(3n);
  });
});

describe('getOperatorTypeByCurveId', () => {
  it('returns CSM operator type for CSM module', () => {
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 0n,
        module: MODULE_NAME.CSM,
      }),
    ).toBe(OPERATOR_TYPE.CSM_DEF);
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 1n,
        module: MODULE_NAME.CSM,
      }),
    ).toBe(OPERATOR_TYPE.CSM_LEA);
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 2n,
        module: MODULE_NAME.CSM,
      }),
    ).toBe(OPERATOR_TYPE.CSM_ICS);
  });

  it('returns CM operator type for CM module', () => {
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 0n,
        module: MODULE_NAME.CM,
      }),
    ).toBe(OPERATOR_TYPE.CM_PO);
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 1n,
        module: MODULE_NAME.CM,
      }),
    ).toBe(OPERATOR_TYPE.CM_PTO);
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 2n,
        module: MODULE_NAME.CM,
      }),
    ).toBe(OPERATOR_TYPE.CM_PGO);
  });

  it('is module-specific: colliding curve ids resolve per module', () => {
    // Curve 0 exists in both modules on every chain and must resolve to the
    // module's own type, never leak across modules.
    expect(
      getOperatorTypeByCurveId(CHAINS.Mainnet, {
        curveId: 0n,
        module: MODULE_NAME.CSM,
      }),
    ).toBe(OPERATOR_TYPE.CSM_DEF);
    expect(
      getOperatorTypeByCurveId(CHAINS.Mainnet, {
        curveId: 0n,
        module: MODULE_NAME.CM,
      }),
    ).toBe(OPERATOR_TYPE.CM_PO);
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 0n,
        module: MODULE_NAME.CSM,
      }),
    ).toBe(OPERATOR_TYPE.CSM_DEF);
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 0n,
        module: MODULE_NAME.CM,
      }),
    ).toBe(OPERATOR_TYPE.CM_PO);
  });

  it('returns undefined for unknown curveId', () => {
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 999n,
        module: MODULE_NAME.CSM,
      }),
    ).toBeUndefined();
  });

  it('returns undefined for undefined ref', () => {
    expect(getOperatorTypeByCurveId(CHAINS.Mainnet, undefined)).toBeUndefined();
  });

  it('is chain-specific: curve 3 resolves differently per chain', () => {
    // mainnet curve 3 is IDVTC; on hoodi IDVTC is curve 4 and CSM curve 3
    // does not exist
    expect(
      getOperatorTypeByCurveId(CHAINS.Mainnet, {
        curveId: 3n,
        module: MODULE_NAME.CSM,
      }),
    ).toBe(OPERATOR_TYPE.CSM_IDVTC);
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 3n,
        module: MODULE_NAME.CSM,
      }),
    ).toBeUndefined();
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, {
        curveId: 4n,
        module: MODULE_NAME.CSM,
      }),
    ).toBe(OPERATOR_TYPE.CSM_IDVTC);
  });
});

describe('getCurveRefByOperatorType', () => {
  it('is chain-specific: same operator type maps to different curve ids', () => {
    expect(
      getCurveRefByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CSM_IDVTC),
    ).toEqual({ curveId: 4n, module: MODULE_NAME.CSM });
    expect(
      getCurveRefByOperatorType(CHAINS.Mainnet, OPERATOR_TYPE.CSM_IDVTC),
    ).toEqual({ curveId: 3n, module: MODULE_NAME.CSM });
  });

  it('returns the ref for a CM type', () => {
    expect(
      getCurveRefByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CM_PO),
    ).toEqual({ curveId: 0n, module: MODULE_NAME.CM });
  });

  it('round-trips through getOperatorTypeByCurveId for every type and chain', () => {
    const deployed = Object.values(OPERATOR_TYPE).flatMap((type) =>
      SUPPORTED_CHAINS.map((chain) => ({
        type,
        chain,
        ref: getCurveRefByOperatorType(chain, type),
      })).filter(
        (entry): entry is typeof entry & { ref: CurveRef } =>
          entry.ref !== undefined,
      ),
    );
    expect(deployed.length).toBeGreaterThan(0);
    for (const { type, chain, ref } of deployed) {
      expect(getOperatorTypeByCurveId(chain, ref)).toBe(type);
    }
  });

  it('narrows the module type for literal operator types', () => {
    expectTypeOf(
      getCurveRefByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CM_PO),
    ).toEqualTypeOf<CurveRef<MODULE_NAME.CM> | undefined>();
  });
});

describe('getOperatorTypesForModule', () => {
  it('returns exactly the CSM types on hoodi', () => {
    const result = getOperatorTypesForModule(CHAINS.Hoodi, MODULE_NAME.CSM);
    expect(result.sort()).toEqual(
      [
        OPERATOR_TYPE.CSM_DEF,
        OPERATOR_TYPE.CSM_LEA,
        OPERATOR_TYPE.CSM_ICS,
        OPERATOR_TYPE.CSM_IDVTC,
      ].sort(),
    );
  });

  it('returns exactly the CSM_02 types on hoodi', () => {
    expect(getOperatorTypesForModule(CHAINS.Hoodi, MODULE_NAME.CSM_02)).toEqual(
      [OPERATOR_TYPE.CSM2_DEF],
    );
  });

  it('never returns a type from another module', () => {
    expect(
      getOperatorTypesForModule(CHAINS.Mainnet, MODULE_NAME.CM),
    ).not.toContain(OPERATOR_TYPE.CSM_DEF);
  });
});
