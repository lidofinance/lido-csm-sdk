import { DepositDataErrors } from '../types.js';

export const hasErrors = (errors: DepositDataErrors) =>
  errors.some((list) => list.length > 0);
