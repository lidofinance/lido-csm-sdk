import { describe, expect, it } from 'vitest';
import {
  AbiDecodingDataSizeTooSmallError,
  ExecutionRevertedError,
  TimeoutError,
} from 'viem';
import { isContractCallFailure } from '../../../src/wallet-sdk/is-contract-call-failure';
import {
  asReadContractError,
  revertError,
  transportError,
  zeroDataError,
} from './contract-call-errors';

describe('isContractCallFailure', () => {
  it.each([
    ['empty return data', zeroDataError()],
    ['a decoded revert', revertError()],
    ['a node-level revert', asReadContractError(new ExecutionRevertedError())],
    [
      'short return data',
      asReadContractError(
        new AbiDecodingDataSizeTooSmallError({
          data: '0x01',
          params: [{ type: 'uint256' }],
          size: 1,
        }),
      ),
    ],
  ])('true for %s', (_label, error) => {
    expect(isContractCallFailure(error)).toBe(true);
  });

  it.each([
    ['an HTTP failure', transportError()],
    [
      'a request timeout',
      asReadContractError(
        new TimeoutError({ body: {}, url: 'http://rpc.test' }),
      ),
    ],
    ['a plain Error', new Error('boom')],
  ])('false for %s', (_label, error) => {
    expect(isContractCallFailure(error)).toBe(false);
  });
});
