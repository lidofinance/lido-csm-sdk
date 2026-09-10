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

/** Modules whose keys wait in a deposit queue before activation. */
export const DEPOSIT_QUEUE_MODULES: Set<MODULE_NAME> = new Set([
  MODULE_NAME.CSM,
  MODULE_NAME.CSM_02,
]);

/** Modules with per-key allocated balances (0x02 variable effective balance). */
export const ALLOCATED_BALANCE_MODULES: Set<MODULE_NAME> = new Set([
  MODULE_NAME.CM,
  MODULE_NAME.CSM_02,
]);

/** Modules with a separate top-up queue for already-deposited 0x02 keys. */
export const TOPUP_QUEUE_MODULES: Set<MODULE_NAME> = new Set([
  MODULE_NAME.CSM_02,
]);
