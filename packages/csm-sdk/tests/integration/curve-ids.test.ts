import { describe, expect, it } from 'vitest';
import {
  CONTRACT_NAMES,
  CURATED_GATES,
  getOperatorTypesForModule,
  MODULE_NAME,
  OPERATOR_TYPE,
  OPERATOR_TYPE_INFO,
} from '../../src/common';
import { useCmSdk, useCsmSdk } from '../helpers';

// Pins the static per-type curve-id table (OPERATOR_TYPE_INFO) to on-chain
// truth: gate contracts own their curve id via curveId()/CURVE_ID(). If a
// curve assignment changes or a new gate lands on the forked chain, this
// fails instead of letting the labeling table drift silently. Each test also
// asserts completeness: every table entry must be pinned by a gate check, so
// a new entry without an on-chain gate fails.

const CURATED_GATE_TYPES: Record<CURATED_GATES, OPERATOR_TYPE> = {
  [CONTRACT_NAMES.curatedGatePO]: OPERATOR_TYPE.CM_PO,
  [CONTRACT_NAMES.curatedGatePTO]: OPERATOR_TYPE.CM_PTO,
  [CONTRACT_NAMES.curatedGatePGO]: OPERATOR_TYPE.CM_PGO,
  [CONTRACT_NAMES.curatedGateDO]: OPERATOR_TYPE.CM_DO,
  [CONTRACT_NAMES.curatedGateEEO]: OPERATOR_TYPE.CM_EEO,
  [CONTRACT_NAMES.curatedGateIODC]: OPERATOR_TYPE.CM_IODC,
  [CONTRACT_NAMES.curatedGateIODCP]: OPERATOR_TYPE.CM_IODCP,
};

describe('integration: OPERATOR_TYPE_INFO matches on-chain gate curves', () => {
  it('CSM gates report the curve ids from the static table', async () => {
    const sdk = useCsmSdk();
    const curveOf = (t: OPERATOR_TYPE) =>
      OPERATOR_TYPE_INFO[t].curveId[sdk.core.chainId];

    await expect(sdk.permissionlessGate.getCurveId()).resolves.toBe(
      curveOf(OPERATOR_TYPE.CSM_DEF),
    );
    await expect(sdk.icsGate.getCurveId()).resolves.toBe(
      curveOf(OPERATOR_TYPE.CSM_ICS),
    );
    await expect(sdk.idvtcGate.getCurveId()).resolves.toBe(
      curveOf(OPERATOR_TYPE.CSM_IDVTC),
    );

    // Completeness: every available type is pinned by a gate check above.
    // CSM_LEA is explicitly exempt — legacy curve, no gate contract exists.
    const coveredTypes = [
      OPERATOR_TYPE.CSM_DEF,
      OPERATOR_TYPE.CSM_ICS,
      OPERATOR_TYPE.CSM_IDVTC,
      OPERATOR_TYPE.CSM_LEA,
    ];
    const availableTypes = getOperatorTypesForModule(
      sdk.core.chainId,
      MODULE_NAME.CSM,
    );
    for (const operatorType of availableTypes) {
      expect(coveredTypes, `type ${operatorType} has no gate check`).toContain(
        operatorType,
      );
    }
  });

  it('CM curated gates report the curve ids from the static table', async () => {
    const sdk = useCmSdk();
    const curveOf = (t: OPERATOR_TYPE) =>
      OPERATOR_TYPE_INFO[t].curveId[sdk.core.chainId];

    const coveredTypes: OPERATOR_TYPE[] = [];
    for (const [gateName, gate] of sdk.curatedGates.getAll()) {
      const operatorType = CURATED_GATE_TYPES[gateName];
      const curveId = await gate.getCurveId();
      expect(curveId, `gate ${gateName}`).toBe(curveOf(operatorType));
      coveredTypes.push(operatorType);
    }

    // Completeness: every available type is pinned by an on-chain gate.
    const availableTypes = getOperatorTypesForModule(
      sdk.core.chainId,
      MODULE_NAME.CM,
    );
    for (const operatorType of availableTypes) {
      expect(coveredTypes, `type ${operatorType} has no gate`).toContain(
        operatorType,
      );
    }
  });
});
