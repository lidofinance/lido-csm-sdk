import { CONTRACT_NAMES } from './contract-names';

export enum MODULE_NAME {
  CSM = 'CSM',
  CM = 'CM',
  CSM_02 = 'CSM_02',
}

export type PerModule<T> = {
  [key in MODULE_NAME]: T;
};

export const MODULE_CONTRACT: PerModule<CONTRACT_NAMES> = {
  [MODULE_NAME.CSM]: CONTRACT_NAMES.csModule,
  [MODULE_NAME.CM]: CONTRACT_NAMES.curatedModule,
  [MODULE_NAME.CSM_02]: CONTRACT_NAMES.csModule,
};
