import { describe, it, expect } from 'vitest';
import {
  BaseError,
  decodeFunctionResult,
  encodeAbiParameters,
  getAbiItem,
  HttpRequestError,
} from 'viem';
import {
  isEnumConversionPanic,
  isLegacyDecodeError,
  requiresUpgradedImpl,
} from '../../../src/discovery-sdk/legacy-impl';
import { SearchMode } from '../../../src/discovery-sdk/types';
import { SMDiscoveryAbi } from '../../../src/abi/SMDiscovery';
import { SMDiscoveryV1Abi } from '../../../src/abi/SMDiscoveryV1';
import { buildPanicError, buildRevertError } from './helpers';

describe('requiresUpgradedImpl', () => {
  it.each([
    [SearchMode.CURRENT_ADDRESSES, false],
    [SearchMode.PROPOSED_ADDRESSES, false],
    [SearchMode.ALL_ADDRESSES, false],
    [SearchMode.CLAIMER, true],
    [SearchMode.ANY_ROLE, true],
  ])('%s -> %s', (mode, expected) => {
    expect(requiresUpgradedImpl(mode)).toBe(expected);
  });
});

describe('isEnumConversionPanic', () => {
  it('is true for a genuine Panic(0x21) revert', () => {
    expect(isEnumConversionPanic(buildPanicError(0x21n))).toBe(true);
  });

  it('is true when the panic is wrapped in a BaseError cause chain', () => {
    const wrapper = new BaseError('wrapper', {
      cause: buildPanicError(0x21n),
    });
    expect(isEnumConversionPanic(wrapper)).toBe(true);
  });

  it('is false for Panic(0x11) (arithmetic overflow)', () => {
    expect(isEnumConversionPanic(buildPanicError(0x11n))).toBe(false);
  });

  it('is false for a custom-error revert', () => {
    expect(isEnumConversionPanic(buildRevertError())).toBe(false);
  });

  it('is false for a plain Error', () => {
    expect(isEnumConversionPanic(new Error('boom'))).toBe(false);
  });
});

const LEGACY_SHORT_COMPONENTS = getAbiItem({
  abi: SMDiscoveryV1Abi,
  name: 'getOperatorsByCurveId',
}).outputs;

/** Legacy-shaped payload decoded against the modern ABI: reads past the encoded data. */
const buildDecodeError = (): Error => {
  const data = encodeAbiParameters(LEGACY_SHORT_COMPONENTS, [
    [
      {
        id: 7n,
        managerAddress: '0x1111111111111111111111111111111111111111',
        rewardAddress: '0x2222222222222222222222222222222222222222',
        extendedManagerPermissions: true,
        curveId: 2n,
      },
    ],
  ]);
  try {
    decodeFunctionResult({
      abi: SMDiscoveryAbi,
      functionName: 'getOperatorsByCurveId',
      data,
    });
    throw new Error('expected decode to fail on a legacy-shaped payload');
  } catch (error) {
    return error as Error;
  }
};

describe('isLegacyDecodeError', () => {
  it('is true for a genuine decode error from a legacy-shaped payload', () => {
    expect(isLegacyDecodeError(buildDecodeError())).toBe(true);
  });

  it('is true when the decode error is wrapped in a BaseError cause chain', () => {
    const wrapper = new BaseError('wrapper', { cause: buildDecodeError() });
    expect(isLegacyDecodeError(wrapper)).toBe(true);
  });

  it('is false for a genuine contract revert', () => {
    expect(isLegacyDecodeError(buildRevertError())).toBe(false);
  });

  it('is false for a plain Error', () => {
    expect(isLegacyDecodeError(new Error('boom'))).toBe(false);
  });

  it('is false for a transient HttpRequestError', () => {
    const error = new HttpRequestError({
      url: 'http://x',
      details: 'timeout',
    });
    expect(isLegacyDecodeError(error)).toBe(false);
  });
});
