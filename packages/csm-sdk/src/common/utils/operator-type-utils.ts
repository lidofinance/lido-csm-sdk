import {
  MODULE_NAME,
  OPERATOR_TYPE_CURVE_ID,
  OPERATOR_TYPE,
} from '../constants/index.js';

export const getCurveIdByOperatorType = (
  operatorType: OPERATOR_TYPE,
): bigint | undefined => {
  return OPERATOR_TYPE_CURVE_ID[operatorType];
};

export const getOperatorTypeByCurveId = (
  moduleName: keyof typeof MODULE_NAME,
  curveId: bigint | undefined,
): OPERATOR_TYPE => {
  const entry = Object.entries(OPERATOR_TYPE_CURVE_ID).find(
    ([operatorType, id]) =>
      id === curveId && operatorType.startsWith(`${moduleName}_`),
  );
  return entry?.[0] as OPERATOR_TYPE | OPERATOR_TYPE.CC;
};
