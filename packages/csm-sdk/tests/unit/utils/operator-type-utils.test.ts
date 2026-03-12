import { describe, it, expect } from 'vitest';
import {
  getCurveIdByOperatorType,
  getOperatorTypeByCurveId,
} from '../../../src/common/utils/operator-type-utils.js';
import { OPERATOR_TYPE } from '../../../src/common/constants/operator-types.js';

describe('getCurveIdByOperatorType', () => {
  it('returns correct curve ID for CSM types', () => {
    expect(getCurveIdByOperatorType(OPERATOR_TYPE.CSM_DEF)).toBe(0n);
    expect(getCurveIdByOperatorType(OPERATOR_TYPE.CSM_LEA)).toBe(1n);
    expect(getCurveIdByOperatorType(OPERATOR_TYPE.CSM_ICS)).toBe(2n);
  });

  it('returns correct curve ID for CM types', () => {
    expect(getCurveIdByOperatorType(OPERATOR_TYPE.CM_PTO)).toBe(0n);
    expect(getCurveIdByOperatorType(OPERATOR_TYPE.CM_PO)).toBe(1n);
  });

  it('returns undefined for CC type', () => {
    expect(getCurveIdByOperatorType(OPERATOR_TYPE.CC)).toBeUndefined();
  });
});

describe('getOperatorTypeByCurveId', () => {
  it('returns CSM operator type for CSM module', () => {
    expect(getOperatorTypeByCurveId('CSM', 0n)).toBe(OPERATOR_TYPE.CSM_DEF);
    expect(getOperatorTypeByCurveId('CSM', 1n)).toBe(OPERATOR_TYPE.CSM_LEA);
    expect(getOperatorTypeByCurveId('CSM', 2n)).toBe(OPERATOR_TYPE.CSM_ICS);
  });

  it('returns CM operator type for CM module', () => {
    expect(getOperatorTypeByCurveId('CM', 0n)).toBe(OPERATOR_TYPE.CM_PTO);
    expect(getOperatorTypeByCurveId('CM', 1n)).toBe(OPERATOR_TYPE.CM_PO);
    expect(getOperatorTypeByCurveId('CM', 2n)).toBe(OPERATOR_TYPE.CM_PGO);
  });

  it('returns undefined-cast for unknown curveId', () => {
    // CC has curveId=undefined, so passing undefined won't match
    // because find compares id === curveId and CC's id is undefined
    const result = getOperatorTypeByCurveId('CSM', 999n);
    expect(result).toBeUndefined();
  });
});
