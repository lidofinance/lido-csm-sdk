import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it, vi } from 'vitest';
import {
  zeroAddress,
  type Address,
  decodeFunctionResult,
  encodeAbiParameters,
  getAbiItem,
  HttpRequestError,
} from 'viem';
import { DiscoverySDK } from '../../../src/discovery-sdk/discovery-sdk';
import { SearchMode } from '../../../src/discovery-sdk/types';
import { SMDiscoveryAbi } from '../../../src/abi/SMDiscovery';
import { SMDiscoveryV1Abi } from '../../../src/abi/SMDiscoveryV1';
import { OPERATOR_TYPE } from '../../../src/common/constants/operator-types';
import { MODULE_NAME } from '../../../src/common/constants/module-name';
import { getOperatorTypesForModule } from '../../../src/common/utils/operator-type-utils';
import { SDKError } from '../../../src/common/utils/sdk-error';
import { ERROR_CODE } from '../../../src/common/utils/sdk-error-code';
import { UPGRADE_REQUIRED_MESSAGE } from '../../../src/discovery-sdk/legacy-impl';
import { buildPanicError, buildRevertError } from './helpers';

// Explicit pagination everywhere: paginateOperators then never needs bus.module.getOperatorsCount().

const MANAGER: Address = '0x1111111111111111111111111111111111111111';
const REWARDS: Address = '0x2222222222222222222222222222222222222222';
const CLAIMER: Address = '0x3333333333333333333333333333333333333333';

const RAW_OPERATOR = {
  id: 7n,
  managerAddress: MANAGER,
  rewardAddress: REWARDS,
  extendedManagerPermissions: true,
  claimerAddress: CLAIMER,
  curveId: 2n,
};

const makeSdk = ({
  chainId = CHAINS.Mainnet,
  moduleId = 3n,
  moduleName = MODULE_NAME.CSM,
  read = vi.fn().mockResolvedValue([RAW_OPERATOR]),
  readV1 = vi.fn(),
}: {
  chainId?: CHAINS;
  moduleId?: bigint;
  moduleName?: MODULE_NAME;
  read?: ReturnType<typeof vi.fn>;
  readV1?: ReturnType<typeof vi.fn>;
} = {}) => {
  const fakeCore = {
    chainId,
    moduleId,
    moduleName,
    getContract: () => ({
      read: {
        getOperatorsByCurveId: read,
        getNodeOperatorsByAddress: read,
        getAllNodeOperators: read,
        findNodeOperatorsByAddress: read,
      },
    }),
    getContractWithAbi: () => ({
      read: {
        getOperatorsByCurveId: readV1,
        getNodeOperatorsByAddress: readV1,
        getAllNodeOperators: readV1,
      },
    }),
  };
  return {
    sdk: new DiscoverySDK({ core: fakeCore as never }),
    read,
    readV1,
  };
};

// Legacy (pre-claimer) `getOperatorsByCurveId`/`getNodeOperatorsByAddress` output shape.
const LEGACY_SHORT_COMPONENTS = getAbiItem({
  abi: SMDiscoveryV1Abi,
  name: 'getOperatorsByCurveId',
}).outputs;

const { claimerAddress: _claimer, ...LEGACY_OPERATOR } = RAW_OPERATOR;

/** Legacy-shaped payload decoded against the modern ABI: reads past the encoded data. */
const buildDecodeError = (): Error => {
  const data = encodeAbiParameters(LEGACY_SHORT_COMPONENTS, [
    [LEGACY_OPERATOR],
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

const PROPOSED_MANAGER: Address = '0x4444444444444444444444444444444444444444';
const PROPOSED_REWARDS: Address = '0x5555555555555555555555555555555555555555';

const RAW_FULL_OPERATOR = {
  ...RAW_OPERATOR,
  proposedManagerAddress: PROPOSED_MANAGER,
  proposedRewardAddress: PROPOSED_REWARDS,
};

const LEGACY_FULL_COMPONENTS = getAbiItem({
  abi: SMDiscoveryV1Abi,
  name: 'getAllNodeOperators',
}).outputs;

const { claimerAddress: _fullClaimer, ...LEGACY_FULL_OPERATOR } =
  RAW_FULL_OPERATOR;

/** Same as `buildDecodeError`, for the full `getAllNodeOperators` struct. */
const buildFullDecodeError = (): Error => {
  const data = encodeAbiParameters(LEGACY_FULL_COMPONENTS, [
    [LEGACY_FULL_OPERATOR],
  ]);
  try {
    decodeFunctionResult({
      abi: SMDiscoveryAbi,
      functionName: 'getAllNodeOperators',
      data,
    });
    throw new Error('expected decode to fail on a legacy-shaped payload');
  } catch (error) {
    return error as Error;
  }
};

describe('DiscoverySDK.getOperatorsByType', () => {
  it('resolves the curve id for the operator type and delegates to getOperatorsByCurveId', async () => {
    const { sdk, read } = makeSdk({ chainId: CHAINS.Mainnet, moduleId: 3n });

    const result = await sdk.getOperatorsByType(OPERATOR_TYPE.CSM_ICS, {
      offset: 0n,
      limit: 10n,
    });

    // CSM_ICS -> curveId 2n on Mainnet, see operator-types.ts.
    expect(read).toHaveBeenCalledWith([3n, 2n, 0n, 10n]);
    // toShortInfo spreads the raw operator (keeping `id`/`rewardAddress`)
    // while adding the renamed `nodeOperatorId`/`rewardsAddress` fields.
    expect(result).toEqual([
      {
        ...RAW_OPERATOR,
        nodeOperatorId: 7n,
        rewardsAddress: REWARDS,
      },
    ]);
  });

  it('normalizes a zero-address claimer to undefined', async () => {
    const { sdk } = makeSdk({
      read: vi
        .fn()
        .mockResolvedValue([{ ...RAW_OPERATOR, claimerAddress: zeroAddress }]),
    });

    const result = await sdk.getOperatorsByType(OPERATOR_TYPE.CSM_ICS, {
      offset: 0n,
      limit: 10n,
    });

    expect(result[0]!.claimerAddress).toBeUndefined();
  });

  it('resolves a different curve id on a different chain for the same type', async () => {
    const { sdk, read } = makeSdk({ chainId: CHAINS.Hoodi, moduleId: 4n });

    await sdk.getOperatorsByType(OPERATOR_TYPE.CSM_IDVTC, {
      offset: 0n,
      limit: 5n,
    });

    // CSM_IDVTC -> curveId 4n on Hoodi (vs 3n on Mainnet).
    expect(read).toHaveBeenCalledWith([4n, 4n, 0n, 5n]);
  });

  // `OPERATOR_TYPE_INFO[CM_PO].module` is MODULE_NAME.CM, while this SDK is
  // configured for MODULE_NAME.CSM (the default) — a genuine foreign-module
  // type, caught by the merged module+curveId availability check.
  it('throws INVALID_ARGUMENT for a foreign-module operator type', async () => {
    const { sdk, read } = makeSdk({ moduleName: MODULE_NAME.CSM });

    await expect(
      sdk.getOperatorsByType(OPERATOR_TYPE.CM_PO, { offset: 0n, limit: 10n }),
    ).rejects.toMatchObject({
      code: ERROR_CODE.INVALID_ARGUMENT,
    } satisfies Partial<SDKError>);
    expect(read).not.toHaveBeenCalled();
  });
});

describe('DiscoverySDK.getAvailableOperatorTypes', () => {
  it('matches getOperatorTypesForModule for the configured chain and module', () => {
    const { sdk } = makeSdk({
      chainId: CHAINS.Mainnet,
      moduleName: MODULE_NAME.CSM,
    });

    const result = sdk.getAvailableOperatorTypes();

    expect(result).toEqual(
      getOperatorTypesForModule(CHAINS.Mainnet, MODULE_NAME.CSM),
    );
    expect(result).toContain(OPERATOR_TYPE.CSM_DEF);
    expect(result).not.toContain(OPERATOR_TYPE.CM_PO);
  });
});

describe('DiscoverySDK legacy SMDiscovery fallback', () => {
  it('falls back to the legacy ABI when the modern read fails to decode, normalizing missing claimer to undefined', async () => {
    const read = vi.fn().mockRejectedValue(buildDecodeError());
    const readV1 = vi.fn().mockResolvedValue([LEGACY_OPERATOR]);
    const { sdk } = makeSdk({ read, readV1 });

    const result = await sdk.getOperatorsByCurveId(2n, {
      offset: 0n,
      limit: 10n,
    });

    expect(readV1).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        ...LEGACY_OPERATOR,
        nodeOperatorId: 7n,
        rewardsAddress: REWARDS,
        claimerAddress: undefined,
      },
    ]);
  });

  it('memoizes the legacy fallback so a follow-up call skips the modern read entirely', async () => {
    const read = vi.fn().mockRejectedValue(buildDecodeError());
    const readV1 = vi.fn().mockResolvedValue([LEGACY_OPERATOR]);
    const { sdk } = makeSdk({ read, readV1 });

    await sdk.getOperatorsByCurveId(2n, { offset: 0n, limit: 10n });
    await sdk.getOperatorsByCurveId(2n, { offset: 0n, limit: 10n });

    expect(read).toHaveBeenCalledTimes(1);
    expect(readV1).toHaveBeenCalledTimes(2);
  });

  it('does not fall back on a genuine contract revert, keeping the onRevertEmptyList behavior', async () => {
    const read = vi.fn().mockRejectedValue(buildRevertError());
    const readV1 = vi.fn();
    const { sdk } = makeSdk({ read, readV1 });

    const result = await sdk.getOperatorsByCurveId(2n, {
      offset: 0n,
      limit: 10n,
    });

    expect(result).toEqual([]);
    expect(readV1).not.toHaveBeenCalled();
  });

  it('surfaces the original modern error when the legacy retry also fails', async () => {
    const decodeError = buildDecodeError();
    const read = vi.fn().mockRejectedValue(decodeError);
    const readV1 = vi.fn().mockRejectedValue(new Error('legacy also broken'));
    const { sdk } = makeSdk({ read, readV1 });

    const error: SDKError = await sdk
      .getOperatorsByCurveId(2n, { offset: 0n, limit: 10n })
      .catch((e) => e);

    expect(error).toBeInstanceOf(SDKError);
    expect(error.cause).toBe(decodeError);
  });

  it('the legacy flag set by a versioned read also blocks unsupported SearchMode', async () => {
    const read = vi.fn().mockRejectedValue(buildDecodeError());
    const readV1 = vi.fn().mockResolvedValue([LEGACY_OPERATOR]);
    const { sdk } = makeSdk({ read, readV1 });

    await sdk.getOperatorsByCurveId(2n, { offset: 0n, limit: 10n });
    read.mockClear();

    await expect(
      sdk.getNodeOperatorIds(MANAGER, SearchMode.CLAIMER, {
        offset: 0n,
        limit: 10n,
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODE.NOT_SUPPORTED,
    } satisfies Partial<SDKError>);
    expect(read).not.toHaveBeenCalled();
  });

  it('does not fall back on a transient non-decode error and does not flip the legacy flag', async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(
        new HttpRequestError({ url: 'http://x', details: 'timeout' }),
      );
    const readV1 = vi.fn();
    const { sdk } = makeSdk({ read, readV1 });

    await expect(
      sdk.getOperatorsByCurveId(2n, { offset: 0n, limit: 10n }),
    ).rejects.toBeDefined();
    expect(readV1).not.toHaveBeenCalled();

    read.mockResolvedValueOnce([RAW_OPERATOR]);

    await expect(
      sdk.getOperatorsByCurveId(2n, { offset: 0n, limit: 10n }),
    ).resolves.toEqual([
      {
        ...RAW_OPERATOR,
        nodeOperatorId: 7n,
        rewardsAddress: REWARDS,
      },
    ]);
    expect(readV1).not.toHaveBeenCalled();
  });

  it('after the panic on CLAIMER flips the flag, getOperatorsByCurveId goes straight to readV1 without calling read', async () => {
    const read = vi.fn().mockRejectedValue(buildPanicError(0x21n));
    const readV1 = vi.fn().mockResolvedValue([LEGACY_OPERATOR]);
    const { sdk } = makeSdk({ read, readV1 });

    await sdk
      .getNodeOperatorIds(MANAGER, SearchMode.CLAIMER, {
        offset: 0n,
        limit: 10n,
      })
      .catch(() => undefined);
    read.mockClear();

    const result = await sdk.getOperatorsByCurveId(2n, {
      offset: 0n,
      limit: 10n,
    });

    expect(read).not.toHaveBeenCalled();
    expect(readV1).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        ...LEGACY_OPERATOR,
        nodeOperatorId: 7n,
        rewardsAddress: REWARDS,
        claimerAddress: undefined,
      },
    ]);
  });
});

describe('DiscoverySDK.getNodeOperatorIds legacy SearchMode guard', () => {
  it('rejects with NOT_SUPPORTED (not an empty list) when the legacy impl panics on an unsupported SearchMode', async () => {
    const read = vi.fn().mockRejectedValue(buildPanicError(0x21n));
    const { sdk } = makeSdk({ read });

    await expect(
      sdk.getNodeOperatorIds(MANAGER, SearchMode.CLAIMER, {
        offset: 0n,
        limit: 10n,
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODE.NOT_SUPPORTED,
      message: UPGRADE_REQUIRED_MESSAGE,
    } satisfies Partial<SDKError>);
  });

  it('memoizes the legacy detection so a follow-up unsupported SearchMode call skips the contract entirely', async () => {
    const read = vi.fn().mockRejectedValue(buildPanicError(0x21n));
    const { sdk } = makeSdk({ read });

    await sdk
      .getNodeOperatorIds(MANAGER, SearchMode.CLAIMER, {
        offset: 0n,
        limit: 10n,
      })
      .catch(() => undefined);
    read.mockClear();

    await expect(
      sdk.getNodeOperatorIds(MANAGER, SearchMode.ANY_ROLE, {
        offset: 0n,
        limit: 10n,
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODE.NOT_SUPPORTED,
    } satisfies Partial<SDKError>);
    expect(read).not.toHaveBeenCalled();
  });

  it('a supported SearchMode still queries the contract on a legacy impl', async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(buildPanicError(0x21n))
      .mockResolvedValueOnce([1n, 2n]);
    const { sdk } = makeSdk({ read });

    await sdk
      .getNodeOperatorIds(MANAGER, SearchMode.CLAIMER, {
        offset: 0n,
        limit: 10n,
      })
      .catch(() => undefined);

    await expect(
      sdk.getNodeOperatorIds(MANAGER, SearchMode.CURRENT_ADDRESSES, {
        offset: 0n,
        limit: 10n,
      }),
    ).resolves.toEqual([1n, 2n]);
  });

  it('a non-panic revert on an unsupported SearchMode is not mistaken for legacy', async () => {
    const read = vi
      .fn()
      .mockRejectedValue(buildRevertError('findNodeOperatorsByAddress'));
    const { sdk } = makeSdk({ read });

    await expect(
      sdk.getNodeOperatorIds(MANAGER, SearchMode.CLAIMER, {
        offset: 0n,
        limit: 10n,
      }),
    ).resolves.toEqual([]);

    // If the flag had been (wrongly) flipped, this second call would never
    // reach the contract — assertSearchModeSupported would reject upfront.
    await expect(
      sdk.getNodeOperatorIds(MANAGER, SearchMode.CLAIMER, {
        offset: 0n,
        limit: 10n,
      }),
    ).resolves.toEqual([]);
    expect(read).toHaveBeenCalledTimes(2);
  });
});

describe('DiscoverySDK.getAllNodeOperators', () => {
  it('maps a modern read into the full discovery info shape', async () => {
    const read = vi.fn().mockResolvedValue([RAW_FULL_OPERATOR]);
    const { sdk } = makeSdk({ read });

    const result = await sdk.getAllNodeOperators({ offset: 0n, limit: 500n });

    expect(read).toHaveBeenCalledWith([3n, 0n, 500n]);
    expect(result).toEqual([
      {
        ...RAW_FULL_OPERATOR,
        nodeOperatorId: 7n,
        rewardsAddress: REWARDS,
        proposedRewardsAddress: PROPOSED_REWARDS,
      },
    ]);
  });

  it('falls back to the legacy ABI when the modern read fails to decode, normalizing missing claimer to undefined', async () => {
    const read = vi.fn().mockRejectedValue(buildFullDecodeError());
    const readV1 = vi.fn().mockResolvedValue([LEGACY_FULL_OPERATOR]);
    const { sdk } = makeSdk({ read, readV1 });

    const result = await sdk.getAllNodeOperators({ offset: 0n, limit: 500n });

    expect(readV1).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        ...LEGACY_FULL_OPERATOR,
        nodeOperatorId: 7n,
        rewardsAddress: REWARDS,
        proposedRewardsAddress: PROPOSED_REWARDS,
        claimerAddress: undefined,
      },
    ]);
  });
});

describe('DiscoverySDK.getNodeOperatorsByAddress', () => {
  it('queries the contract with the moduleId, address, and pagination, mapping the short info shape', async () => {
    const read = vi.fn().mockResolvedValue([RAW_OPERATOR]);
    const { sdk } = makeSdk({ read });

    const result = await sdk.getNodeOperatorsByAddress(MANAGER, {
      offset: 0n,
      limit: 10n,
    });

    expect(read).toHaveBeenCalledWith([3n, MANAGER, 0n, 10n]);
    expect(result).toEqual([
      {
        ...RAW_OPERATOR,
        nodeOperatorId: 7n,
        rewardsAddress: REWARDS,
      },
    ]);
  });
});
