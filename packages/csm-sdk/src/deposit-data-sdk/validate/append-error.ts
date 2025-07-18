import { DepositDataErrors } from '../types.js';

export const appendError = (
  errors: DepositDataErrors,
  index: number,
  error?: string | void,
) => {
  if (error) errors[index]?.push(error);
  return errors;
};
