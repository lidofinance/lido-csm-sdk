import { MODULE_NAME } from '../constants/index.js';
import {
  CM_OPERATOR_TYPE,
  CM_OPERATOR_TYPE_CURVE_ID,
  CSM_OPERATOR_TYPE,
  CSM_OPERATOR_TYPE_CURVE_ID,
  type OperatorType,
} from '../constants/operator-types.js';

export function getModuleOperatorTypes(
  moduleName: MODULE_NAME.CSM,
): typeof CSM_OPERATOR_TYPE;
export function getModuleOperatorTypes(
  moduleName: MODULE_NAME.CM,
): typeof CM_OPERATOR_TYPE;
export function getModuleOperatorTypes(moduleName: MODULE_NAME) {
  return moduleName === MODULE_NAME.CM ? CM_OPERATOR_TYPE : CSM_OPERATOR_TYPE;
}

export function getModuleCurves(
  moduleName: MODULE_NAME.CSM,
): typeof CSM_OPERATOR_TYPE_CURVE_ID;
export function getModuleCurves(
  moduleName: MODULE_NAME.CM,
): typeof CM_OPERATOR_TYPE_CURVE_ID;
export function getModuleCurves(moduleName: MODULE_NAME) {
  return moduleName === MODULE_NAME.CM
    ? CM_OPERATOR_TYPE_CURVE_ID
    : CSM_OPERATOR_TYPE_CURVE_ID;
}

export const getCurveIdByOperatorType = (
  moduleName: MODULE_NAME,
  operatorType: OperatorType,
): bigint | undefined => {
  const mapping = getModuleCurves(moduleName as MODULE_NAME.CSM);
  return mapping[operatorType as keyof typeof mapping];
};

export function getOperatorTypeByCurveId(
  moduleName: MODULE_NAME.CSM,
  curveId: bigint,
): CSM_OPERATOR_TYPE;
export function getOperatorTypeByCurveId(
  moduleName: MODULE_NAME.CM,
  curveId: bigint,
): CM_OPERATOR_TYPE;
export function getOperatorTypeByCurveId(
  moduleName: MODULE_NAME,
  curveId: bigint,
): OperatorType {
  const mapping = getModuleCurves(moduleName as MODULE_NAME.CSM);
  const entry = Object.entries(mapping).find(([, id]) => id === curveId);
  return entry?.[0] as OperatorType | CSM_OPERATOR_TYPE.CC;
}
