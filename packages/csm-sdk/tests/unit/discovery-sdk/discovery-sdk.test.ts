import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { DiscoverySDK } from '../../../src/discovery-sdk/discovery-sdk';
import { OPERATOR_TYPE } from '../../../src/common/constants/operator-types';
import { MODULE_NAME } from '../../../src/common/constants/module-name';
import { SDKError } from '../../../src/common/utils/sdk-error';
import { ERROR_CODE } from '../../../src/common/utils/sdk-error-code';

// `getOperatorsByType` resolves an OPERATOR_TYPE to a curveId (via
// getCurveIdByOperatorType) and delegates to getOperatorsByCurveId, which in
// turn queries the SMDiscovery contract. Pagination is passed explicitly in
// every test so paginateOperators takes the "single page" branch and never
// needs `bus.module.getOperatorsCount()`.

const MANAGER: Address = '0x1111111111111111111111111111111111111111';
const REWARDS: Address = '0x2222222222222222222222222222222222222222';

const RAW_OPERATOR = {
  id: 7n,
  managerAddress: MANAGER,
  rewardAddress: REWARDS,
  extendedManagerPermissions: true,
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
    getContract: () => ({ read: { getOperatorsByCurveId: read } }),
  };
  return { sdk: new DiscoverySDK({ core: fakeCore as never }), read };
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
    // while adding the renamed `nodeOperatorId`/`rewardsAddress` fields —
    // same behavior as the pre-existing getNodeOperatorsByAddress mapper.
    expect(result).toEqual([
      {
        ...RAW_OPERATOR,
        nodeOperatorId: 7n,
        rewardsAddress: REWARDS,
      },
    ]);
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

  // `OPERATOR_TYPE_MODULE[CM_PO]` is MODULE_NAME.CM, while this SDK is
  // configured for MODULE_NAME.CSM (the default) — a genuine foreign-module
  // type, guarded explicitly before any curve id resolution happens.
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
