export enum CSM_OPERATOR_TYPE {
  DEF = 'DEF',
  LEA = 'LEA',
  ICS = 'ICS',
  CC = 'CC',
}

export const CSM_OPERATOR_TYPE_CURVE_ID = {
  [CSM_OPERATOR_TYPE.DEF]: 0n,
  [CSM_OPERATOR_TYPE.LEA]: 1n,
  [CSM_OPERATOR_TYPE.ICS]: 2n,
  [CSM_OPERATOR_TYPE.CC]: undefined,
} as const;

export enum CM_OPERATOR_TYPE {
  PTO = 'PTO',
  PO = 'PO',
  PGO = 'PGO',
  DO = 'DO',
  EEO = 'EEO',
  MODC = 'MODC',
  IODC = 'IODC',
  CC = 'CC',
}

export const CM_OPERATOR_TYPE_CURVE_ID = {
  [CM_OPERATOR_TYPE.PTO]: 1n,
  [CM_OPERATOR_TYPE.PO]: 2n,
  [CM_OPERATOR_TYPE.PGO]: 3n,
  [CM_OPERATOR_TYPE.DO]: 4n,
  [CM_OPERATOR_TYPE.EEO]: 5n,
  [CM_OPERATOR_TYPE.MODC]: 6n,
  [CM_OPERATOR_TYPE.IODC]: 7n,
  [CM_OPERATOR_TYPE.CC]: undefined,
} as const;

export type OperatorType = CSM_OPERATOR_TYPE | CM_OPERATOR_TYPE;
