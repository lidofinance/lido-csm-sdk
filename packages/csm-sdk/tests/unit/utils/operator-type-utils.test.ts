import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, it, expect } from 'vitest';
import {
  getCurveIdByOperatorType,
  getOperatorTypeByCurveId,
} from '../../../src/common/utils/operator-type-utils';
import { OPERATOR_TYPE } from '../../../src/common/constants/operator-types';
import { MODULE_NAME } from '../../../src/common/constants/module-name';

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
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CSM, 0n)).toBe(
      OPERATOR_TYPE.CSM_DEF,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CSM, 1n)).toBe(
      OPERATOR_TYPE.CSM_LEA,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CSM, 2n)).toBe(
      OPERATOR_TYPE.CSM_ICS,
    );
  });

  it('returns CM operator type for CM module', () => {
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CM, 0n)).toBe(
      OPERATOR_TYPE.CM_PO,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CM, 1n)).toBe(
      OPERATOR_TYPE.CM_PTO,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CM, 2n)).toBe(
      OPERATOR_TYPE.CM_PGO,
    );
  });

  it('is module-specific: colliding curve ids resolve per module', () => {
    // Curve 0 exists in both modules on every chain and must resolve to the
    // module's own type, never leak across modules.
    expect(getOperatorTypeByCurveId(CHAINS.Mainnet, MODULE_NAME.CSM, 0n)).toBe(
      OPERATOR_TYPE.CSM_DEF,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Mainnet, MODULE_NAME.CM, 0n)).toBe(
      OPERATOR_TYPE.CM_PO,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CSM, 0n)).toBe(
      OPERATOR_TYPE.CSM_DEF,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CM, 0n)).toBe(
      OPERATOR_TYPE.CM_PO,
    );
  });

  it('returns undefined for unknown curveId', () => {
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CSM, 999n),
    ).toBeUndefined();
  });

  it('returns undefined for undefined curveId', () => {
    expect(
      getOperatorTypeByCurveId(CHAINS.Mainnet, MODULE_NAME.CM, undefined),
    ).toBeUndefined();
  });

  it('is chain-specific: curve 3 resolves differently per chain', () => {
    // mainnet curve 3 is IDVTC; on hoodi IDVTC is curve 4 and CSM curve 3
    // does not exist
    expect(getOperatorTypeByCurveId(CHAINS.Mainnet, MODULE_NAME.CSM, 3n)).toBe(
      OPERATOR_TYPE.CSM_IDVTC,
    );
    expect(
      getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CSM, 3n),
    ).toBeUndefined();
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, MODULE_NAME.CSM, 4n)).toBe(
      OPERATOR_TYPE.CSM_IDVTC,
    );
  });
});
