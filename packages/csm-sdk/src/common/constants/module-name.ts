import { CONTRACT_NAMES } from './contract-names.js';

export enum MODULE_NAME {
  CSM = 'CSM',
  CM = 'CM',
  CSM0x02 = 'CSM0x02',
}

export type PerModule<T> = {
  [key in MODULE_NAME]: T;
};

export const MODULE_CONTRACT: PerModule<CONTRACT_NAMES> = {
  [MODULE_NAME.CSM]: CONTRACT_NAMES.csModule,
  [MODULE_NAME.CM]: CONTRACT_NAMES.curatedModule,
  [MODULE_NAME.CSM0x02]: CONTRACT_NAMES.csModule,
};
