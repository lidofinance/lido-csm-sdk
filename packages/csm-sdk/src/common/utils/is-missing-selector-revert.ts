import { BaseError, ContractFunctionRevertedError } from 'viem';

/** True when the target has no implementation for the called selector (pre-upgrade proxy), not a typed revert. */
export const isMissingSelectorRevert = (error: unknown): boolean => {
  if (!(error instanceof BaseError)) return false;

  const revertError = error.walk(
    (err) => err instanceof ContractFunctionRevertedError,
  );

  return (
    revertError instanceof ContractFunctionRevertedError &&
    (revertError.raw === undefined || revertError.raw === '0x')
  );
};
