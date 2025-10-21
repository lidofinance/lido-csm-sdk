export enum OPERATOR_TYPE {
  PLS = 'PLS',
  LEA = 'LEA',
  ICS = 'ICS',
  CC = 'CC',
}

export const OPERATOR_TYPE_CURVE_ID: {
  [key in OPERATOR_TYPE]: bigint | undefined;
} = {
  [OPERATOR_TYPE.PLS]: 0n,
  [OPERATOR_TYPE.LEA]: 1n,
  [OPERATOR_TYPE.ICS]: 2n,
  [OPERATOR_TYPE.CC]: undefined,
};
