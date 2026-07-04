import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, it, expect } from 'vitest';
import {
  getCurveIdByOperatorType,
  getOperatorTypeByCurveId,
} from '../../../src/common/utils/operator-type-utils';
import { OPERATOR_TYPE } from '../../../src/common/constants/operator-types';

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

  it('returns undefined for CC type', () => {
    expect(
      getCurveIdByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CC),
    ).toBeUndefined();
    expect(
      getCurveIdByOperatorType(CHAINS.Mainnet, OPERATOR_TYPE.CC),
    ).toBeUndefined();
  });

  it('is chain-specific: curves not registered on mainnet are undefined', () => {
    expect(
      getCurveIdByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CSM_IDVTC),
    ).toBe(4n);
    expect(
      getCurveIdByOperatorType(CHAINS.Mainnet, OPERATOR_TYPE.CSM_IDVTC),
    ).toBeUndefined();

    expect(getCurveIdByOperatorType(CHAINS.Hoodi, OPERATOR_TYPE.CM_PO)).toBe(
      0n,
    );
    expect(
      getCurveIdByOperatorType(CHAINS.Mainnet, OPERATOR_TYPE.CM_PO),
    ).toBeUndefined();
  });
});

describe('getOperatorTypeByCurveId', () => {
  it('returns CSM operator type for CSM module', () => {
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, 'CSM', 0n)).toBe(
      OPERATOR_TYPE.CSM_DEF,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, 'CSM', 1n)).toBe(
      OPERATOR_TYPE.CSM_LEA,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, 'CSM', 2n)).toBe(
      OPERATOR_TYPE.CSM_ICS,
    );
  });

  it('returns CM operator type for CM module', () => {
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, 'CM', 0n)).toBe(
      OPERATOR_TYPE.CM_PO,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, 'CM', 1n)).toBe(
      OPERATOR_TYPE.CM_PTO,
    );
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, 'CM', 2n)).toBe(
      OPERATOR_TYPE.CM_PGO,
    );
  });

  it('returns undefined for unknown curveId', () => {
    expect(getOperatorTypeByCurveId(CHAINS.Hoodi, 'CSM', 999n)).toBeUndefined();
  });

  it('returns undefined for undefined curveId (never matches unregistered types)', () => {
    // Unregistered types hold `undefined` in the map; an undefined input must
    // not accidentally match them.
    expect(
      getOperatorTypeByCurveId(CHAINS.Mainnet, 'CM', undefined),
    ).toBeUndefined();
  });

  it('is chain-specific: mainnet has no CM curves yet', () => {
    expect(getOperatorTypeByCurveId(CHAINS.Mainnet, 'CM', 0n)).toBeUndefined();
    expect(getOperatorTypeByCurveId(CHAINS.Mainnet, 'CSM', 0n)).toBe(
      OPERATOR_TYPE.CSM_DEF,
    );
  });
});
