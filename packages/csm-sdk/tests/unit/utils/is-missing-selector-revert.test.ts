import { describe, it, expect } from 'vitest';
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
} from 'viem';
import { SMDiscoveryAbi } from '../../../src/abi/SMDiscovery';
import { isMissingSelectorRevert } from '../../../src/common/utils/is-missing-selector-revert';

const abi = SMDiscoveryAbi;
const functionName = 'getTopUpQueueItems';

const makeExecutionError = (data: `0x${string}` | undefined) =>
  new ContractFunctionExecutionError(
    new ContractFunctionRevertedError({ abi, functionName, data }),
    { abi, functionName, args: [] },
  );

describe('isMissingSelectorRevert', () => {
  it('returns true when the revert data is empty (0x)', () => {
    expect(isMissingSelectorRevert(makeExecutionError('0x'))).toBe(true);
  });

  it('returns true when the revert data is undefined', () => {
    expect(isMissingSelectorRevert(makeExecutionError(undefined))).toBe(true);
  });

  it('returns false for a typed revert', () => {
    const data = encodeErrorResult({
      abi,
      errorName: 'InvalidLimit',
      args: [1000n, 255n],
    });
    expect(isMissingSelectorRevert(makeExecutionError(data))).toBe(false);
  });

  it('returns false for a plain error', () => {
    expect(isMissingSelectorRevert(new Error())).toBe(false);
  });
});
