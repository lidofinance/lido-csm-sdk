import type { AbiStateMutability } from 'abitype';
import {
  encodeFunctionData,
  type Abi,
  type Address,
  type ContractFunctionArgs,
  type ContractFunctionName
} from 'viem';
import { CallResult } from './types.js';

/**
 * Contract-like object with address and ABI
 */
type ContractLike<TAbi extends Abi = Abi> = {
  address: Address;
  abi: TAbi;
};

/**
 * Prepares a contract call for use with viem's sendCalls method
 * @param contract - Contract instance from getContract
 * @param functionName - Name of the contract function to call (type-safe from ABI)
 * @param args - Function arguments (type-safe from ABI)
 * @param value - ETH value to send (required for payable, forbidden for others)
 * @returns Call object compatible with viem sendCalls format
 *
 * @example
 * ```ts
 * const call = prepCall(contract, 'transfer', ['0x...', 100n]);
 * const payableCall = prepCall(contract, 'deposit', [], 1000n); // value required for payable
 * ```
 */
export const prepCall = <
  const abi extends Abi,
  mutability extends AbiStateMutability,
  functionName extends ContractFunctionName<abi, mutability>,
  const args extends ContractFunctionArgs<abi, mutability, functionName>,
>(
  contract: ContractLike<abi>,
  functionName: functionName,
  args: args,
  ...valueArgs: mutability extends 'payable' ? [bigint] : []
): CallResult => ({
  to: contract.address,

  data: encodeFunctionData({
    abi: contract.abi,
    functionName,
    args,
  } as any),

  value: valueArgs[0],
});
