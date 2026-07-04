import {
  MODULE_NAME,
  OPERATOR_TYPE_CURVE_ID,
  OPERATOR_TYPE,
  SUPPORTED_CHAINS,
} from '../constants/index';

export const getCurveIdByOperatorType = (
  chainId: SUPPORTED_CHAINS,
  operatorType: OPERATOR_TYPE,
): bigint | undefined => {
  return OPERATOR_TYPE_CURVE_ID[chainId][operatorType];
};

export const getOperatorTypeByCurveId = (
  chainId: SUPPORTED_CHAINS,
  moduleName: keyof typeof MODULE_NAME,
  curveId: bigint | undefined,
): OPERATOR_TYPE | undefined => {
  if (curveId === undefined) return undefined;
  const entry = Object.entries(OPERATOR_TYPE_CURVE_ID[chainId]).find(
    ([operatorType, id]) =>
      id === curveId && operatorType.startsWith(`${moduleName}_`),
  );
  return entry?.[0] as OPERATOR_TYPE | undefined;
};
