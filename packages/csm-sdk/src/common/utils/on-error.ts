import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
} from 'viem';

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

export const onVersionError = (err: unknown) => {
  if (err instanceof BaseError) {
    const revertError = err.walk(
      (err) =>
        err instanceof ContractFunctionRevertedError ||
        err instanceof ContractFunctionZeroDataError,
    );
    if (
      revertError instanceof ContractFunctionRevertedError ||
      revertError instanceof ContractFunctionZeroDataError
    ) {
      return 0n;
    }
  }

  throw err;
};
