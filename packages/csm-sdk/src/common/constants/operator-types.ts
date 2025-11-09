export enum OPERATOR_TYPE {
  DEF = 'DEF',
  LEA = 'LEA',
  ICS = 'ICS',
  CC = 'CC',
}

// TODO: read from gates
export const OPERATOR_TYPE_CURVE_ID = {
  [OPERATOR_TYPE.DEF]: 0n,
  [OPERATOR_TYPE.LEA]: 1n,
  [OPERATOR_TYPE.ICS]: 2n,
  [OPERATOR_TYPE.CC]: undefined,
} as const;
