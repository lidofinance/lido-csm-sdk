import { ContractFunctionRevertedError, encodeErrorResult } from 'viem';
import { SMDiscoveryAbi } from '../../../src/abi/SMDiscovery';

export const panicErrorAbi = [
  {
    type: 'error',
    name: 'Panic',
    inputs: [{ name: 'reason', type: 'uint256' }],
  },
] as const;

/** Genuine `Panic(reason)` revert, as thrown by Solidity's own enum-conversion/overflow checks. */
export const buildPanicError = (
  reason: bigint,
  functionName = 'findNodeOperatorsByAddress',
) =>
  new ContractFunctionRevertedError({
    abi: SMDiscoveryAbi,
    functionName,
    data: encodeErrorResult({
      abi: panicErrorAbi,
      errorName: 'Panic',
      args: [reason],
    }),
  });

/** Genuine `ContractFunctionRevertedError` for the ABI's own `ZeroModuleId` custom error. */
export const buildRevertError = (functionName = 'getOperatorsByCurveId') =>
  new ContractFunctionRevertedError({
    abi: SMDiscoveryAbi,
    functionName,
    data: encodeErrorResult({ abi: SMDiscoveryAbi, errorName: 'ZeroModuleId' }),
  });
