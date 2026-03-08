import { CONTRACT_NAMES } from './contract-names.js';

export enum MODULE_NAME {
  CSM = 'CSM',
  CM = 'CM',
}

export type PerModule<T> = {
  [key in MODULE_NAME]: T;
};

export const MODULE_CONTRACT: PerModule<CONTRACT_NAMES> = {
  [MODULE_NAME.CSM]: CONTRACT_NAMES.csModule,
  [MODULE_NAME.CM]: CONTRACT_NAMES.curatedModule,
};
