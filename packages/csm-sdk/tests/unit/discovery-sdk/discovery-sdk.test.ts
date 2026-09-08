import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it, vi } from 'vitest';
import { zeroAddress, type Address } from 'viem';
import { DiscoverySDK } from '../../../src/discovery-sdk/discovery-sdk';
import { OPERATOR_TYPE } from '../../../src/common/constants/operator-types';
import { MODULE_NAME } from '../../../src/common/constants/module-name';
import { getOperatorTypesForModule } from '../../../src/common/utils/operator-type-utils';
import { SDKError } from '../../../src/common/utils/sdk-error';
import { ERROR_CODE } from '../../../src/common/utils/sdk-error-code';

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
}: {
  chainId?: CHAINS;
  moduleId?: bigint;
  moduleName?: MODULE_NAME;
  read?: ReturnType<typeof vi.fn>;
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
  };
  return {
    sdk: new DiscoverySDK({ core: fakeCore as never }),
    read,
  };
};

const PROPOSED_MANAGER: Address = '0x4444444444444444444444444444444444444444';
const PROPOSED_REWARDS: Address = '0x5555555555555555555555555555555555555555';

const RAW_FULL_OPERATOR = {
  ...RAW_OPERATOR,
  proposedManagerAddress: PROPOSED_MANAGER,
  proposedRewardAddress: PROPOSED_REWARDS,
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
