import {
  CurveRef,
  MODULE_NAME,
  OPERATOR_TYPE,
  OPERATOR_TYPE_CURVE_REFS,
  OPERATOR_TYPE_INFO,
  SUPPORTED_CHAINS,
} from '../constants/index';

const curveRefEntries = (chainId: SUPPORTED_CHAINS) =>
  Object.entries(OPERATOR_TYPE_CURVE_REFS[chainId]) as [
    OPERATOR_TYPE,
    CurveRef,
  ][];

export const getCurveIdByOperatorType = (
  chainId: SUPPORTED_CHAINS,
  operatorType: OPERATOR_TYPE,
): bigint | undefined => {
  return OPERATOR_TYPE_INFO[operatorType].curveId[chainId];
};

export const getOperatorTypeByCurveId = (
  chainId: SUPPORTED_CHAINS,
  ref: CurveRef | undefined,
): OPERATOR_TYPE | undefined => {
  if (ref === undefined) return undefined;
  return curveRefEntries(chainId).find(
    ([, r]) => r.module === ref.module && r.curveId === ref.curveId,
  )?.[0];
};

/** `undefined` when the gate is not deployed on `chainId`. */
export const getCurveRefByOperatorType = <T extends OPERATOR_TYPE>(
  chainId: SUPPORTED_CHAINS,
  operatorType: T,
): CurveRef<(typeof OPERATOR_TYPE_INFO)[T]['module']> | undefined => {
  const { module, curveId } = OPERATOR_TYPE_INFO[operatorType];
  const id = curveId[chainId];
  return id === undefined ? undefined : { curveId: id, module };
};

/** Operator types with a deployed gate for `moduleName` on `chainId`. */
export const getOperatorTypesForModule = (
  chainId: SUPPORTED_CHAINS,
  moduleName: MODULE_NAME,
): OPERATOR_TYPE[] =>
  curveRefEntries(chainId)
    .filter(([, r]) => r.module === moduleName)
    .map(([t]) => t);
