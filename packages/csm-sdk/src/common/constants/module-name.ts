export enum MODULE_NAME {
  CSM = 'CSM',
  CSM_02 = 'CSM_02',
  CM = 'CM',
}

/** Every module the SDK knows, in canonical order. */
export const SUPPORTED_MODULES: readonly MODULE_NAME[] =
  Object.values(MODULE_NAME);

export type PerModule<T> = {
  [key in MODULE_NAME]: T;
};
