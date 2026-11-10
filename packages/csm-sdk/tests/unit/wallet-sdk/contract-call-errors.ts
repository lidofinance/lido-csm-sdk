import {
  type BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  HttpRequestError,
} from 'viem';
import { SAFE_ABI } from '../../../src/wallet-sdk/safe-abi';

// readContract wraps every failure, transport included, in ContractFunctionExecutionError
export const asReadContractError = (cause: BaseError) =>
  new ContractFunctionExecutionError(cause, {
    abi: SAFE_ABI,
    args: [],
    functionName: 'getThreshold',
  });

export const zeroDataError = () =>
  asReadContractError(
    new ContractFunctionZeroDataError({ functionName: 'getThreshold' }),
  );

export const revertError = () =>
  asReadContractError(
    new ContractFunctionRevertedError({
      abi: SAFE_ABI,
      functionName: 'getThreshold',
    }),
  );

export const transportError = () =>
  asReadContractError(
    new HttpRequestError({ url: 'http://rpc.test', status: 503 }),
  );
