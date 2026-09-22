export enum MODULE_NAME {
  CSM = 'CSM',
  CM = 'CM',
  CSM_02 = 'CSM_02',
}

export type PerModule<T> = {
  [key in MODULE_NAME]: T;
};
