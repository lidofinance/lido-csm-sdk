import {
  AbiDecodingDataSizeTooSmallError,
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  ExecutionRevertedError,
} from 'viem';

/** True when the node answered and the call itself failed (revert, empty or short return); false for transport failures. */
export const isContractCallFailure = (error: unknown): boolean =>
  error instanceof BaseError &&
  !!error.walk(
    (e) =>
      e instanceof ContractFunctionZeroDataError ||
      e instanceof ContractFunctionRevertedError ||
      e instanceof ExecutionRevertedError ||
      e instanceof AbiDecodingDataSizeTooSmallError,
  );
