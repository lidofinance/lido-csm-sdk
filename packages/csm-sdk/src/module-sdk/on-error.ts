import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
} from 'viem';

export const onError = (err: unknown) => {
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

