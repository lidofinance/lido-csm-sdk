import { BaseError, ContractFunctionZeroDataError } from 'viem';

export const onError = (err: unknown) => {
  if (err instanceof BaseError) {
    const emptyError = err.walk(
      (err) => err instanceof ContractFunctionZeroDataError,
    );
    if (emptyError instanceof ContractFunctionZeroDataError) {
      return [null, null];
    }
  }

  throw err;
};
