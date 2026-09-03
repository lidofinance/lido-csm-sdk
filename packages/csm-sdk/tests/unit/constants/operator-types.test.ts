import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  MODULE_NAME,
  OPERATOR_TYPE,
  OperatorTypeOfModule,
  OPERATOR_TYPE_CURVE_REFS,
  OPERATOR_TYPE_INFO,
  SUPPORTED_CHAINS,
} from '../../../src/common/constants/index';

describe('OPERATOR_TYPE_INFO', () => {
  it('has unique curve ids per chain and module', () => {
    for (const chainId of SUPPORTED_CHAINS) {
      const byModule = new Map<MODULE_NAME, bigint[]>();
      for (const ref of Object.values(OPERATOR_TYPE_CURVE_REFS[chainId])) {
        const curveIds = byModule.get(ref.module) ?? [];
        expect(
          curveIds,
          `duplicate curve id ${ref.curveId} for ${ref.module} on chain ${chainId}`,
        ).not.toContain(ref.curveId);
        curveIds.push(ref.curveId);
        byModule.set(ref.module, curveIds);
      }
    }
  });
});

describe('OperatorTypeOfModule (type-level)', () => {
  it('narrows to the types belonging to the given module', () => {
    expectTypeOf<
      OperatorTypeOfModule<MODULE_NAME.CSM_02>
    >().toEqualTypeOf<OPERATOR_TYPE.CSM2_DEF>();
  });
});

describe('OPERATOR_TYPE_CURVE_REFS', () => {
  it('has a key for every supported chain', () => {
    expect(
      Object.keys(OPERATOR_TYPE_CURVE_REFS)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([...SUPPORTED_CHAINS].sort((a, b) => a - b));
  });

  it('matches OPERATOR_TYPE_INFO for every ref it contains', () => {
    for (const chainId of SUPPORTED_CHAINS) {
      const refs = OPERATOR_TYPE_CURVE_REFS[chainId];
      for (const [type, ref] of Object.entries(refs)) {
        const operatorType = type as OPERATOR_TYPE;
        const def = OPERATOR_TYPE_INFO[operatorType];
        expect(ref.module).toBe(def.module);
        expect(ref.curveId).toBe(def.curveId[chainId]);
      }
    }
  });

  it('contains a type on a chain iff its curve id is defined there', () => {
    const results: { present: boolean; defined: boolean }[] = [];
    for (const chainId of SUPPORTED_CHAINS) {
      const refs = OPERATOR_TYPE_CURVE_REFS[chainId];
      for (const operatorType of Object.values(OPERATOR_TYPE)) {
        results.push({
          present: operatorType in refs,
          defined:
            OPERATOR_TYPE_INFO[operatorType].curveId[chainId] !== undefined,
        });
      }
    }
    for (const { present, defined } of results) {
      expect(present).toBe(defined);
    }
  });
});
