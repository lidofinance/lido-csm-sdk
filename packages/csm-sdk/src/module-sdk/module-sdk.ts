import { Address, isAddressEqual } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CACHE_MID,
  CSM_CONTRACT_NAMES,
  SUPPORTED_VERSION_BY_CONTRACT,
} from '../common/index.js';
import { fetchJson } from '../common/utils/fetch-json.js';
import { onVersionError } from '../common/utils/on-error.js';
import { calculateShareLimit } from './calculate-share-limit.js';
import { findModuleDigest } from './find-module-digest.js';
import {
  CsmContractsWithVersion,
  CsmStatus,
  CsmVersions,
  ModuleDigest,
  ModuleOperatorsResponse,
  ModulesResponse,
  ShareLimitInfo,
  ShareLimitStatus,
} from './types.js';
import { bigIntRange } from '../common/utils/bigint-range.js';

export class ModuleSDK extends CsmSDKModule {
  private get moduleContract() {
    return this.core.contractCSModule;
  }

  private get stakingRouterContract() {
    return this.core.contractStakingRouter;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getStatus(): Promise<CsmStatus> {
    const csAccounting = this.core.contractCSAccounting;
    const csModule = this.core.contractCSModule;

    const [isPausedModule, isPausedAccounting] = await Promise.all([
      csModule.read.isPaused(),
      csAccounting.read.isPaused(),
    ]);

    return {
      isPausedModule,
      isPausedAccounting,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getVersions(): Promise<CsmVersions> {
    const [
      module,
      accounting,
      feeDistributor,
      parametersRegistry,
      strikes,
      vettedGate,
    ] = await Promise.all([
      this.core.contractCSModule.read
        .getInitializedVersion()
        .catch(onVersionError),
      this.core.contractCSAccounting.read
        .getInitializedVersion()
        .catch(onVersionError),
      this.core.contractCSFeeDistributor.read
        .getInitializedVersion()
        .catch(onVersionError),
      this.core.contractCSParametersRegistry.read
        .getInitializedVersion()
        .catch(onVersionError),
      this.core.contractCSStrikes.read
        .getInitializedVersion()
        .catch(onVersionError),
      this.core.contractVettedGate.read
        .getInitializedVersion()
        .catch(onVersionError),
    ]);

    return {
      [CSM_CONTRACT_NAMES.csModule]: module,
      [CSM_CONTRACT_NAMES.csAccounting]: accounting,
      [CSM_CONTRACT_NAMES.csFeeDistributor]: feeDistributor,
      [CSM_CONTRACT_NAMES.csParametersRegistry]: parametersRegistry,
      [CSM_CONTRACT_NAMES.csStrikes]: strikes,
      [CSM_CONTRACT_NAMES.vettedGate]: vettedGate,
    };
  }

  public async isVersionsSupported(): Promise<boolean> {
    const versions = await this.getVersions();

    return Object.entries(SUPPORTED_VERSION_BY_CONTRACT)
      .map(([key, [min, max]]) => {
        const current = versions[key as CsmContractsWithVersion];
        return current >= min && current <= max;
      })
      .every(Boolean);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorsCount(): Promise<bigint> {
    return this.moduleContract.read.getNodeOperatorsCount();
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  private async getAllModulesDigests(): Promise<ModuleDigest[]> {
    const digests =
      await this.stakingRouterContract.read.getAllStakingModuleDigests();
    return digests.map((digest) => ({
      ...digest,
      state: {
        ...digest.state,
        stakingModuleFee: BigInt(digest.state.stakingModuleFee),
        stakeShareLimit: BigInt(digest.state.stakeShareLimit),
      },
    }));
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getDigest() {
    const digests = await this.getAllModulesDigests();
    return findModuleDigest(digests, this.core.moduleId);
  }

  @Logger('Utils:')
  public async getShareLimit(): Promise<ShareLimitInfo> {
    const digests = await this.getAllModulesDigests();
    return calculateShareLimit(digests, this.core.moduleId);
  }

  @Logger('Utils:')
  public async getShareLimitStatus(
    shareLimitThreshold = 200n,
  ): Promise<ShareLimitStatus> {
    const info = await this.getShareLimit();

    return info.activeLeft <= 0
      ? ShareLimitStatus.REACHED
      : info.activeLeft - info.queue < 0
        ? ShareLimitStatus.EXHAUSTED
        : info.activeLeft - info.queue < shareLimitThreshold
          ? ShareLimitStatus.APPROACHING
          : ShareLimitStatus.FAR;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getQueues() {
    const queuesCount = await this.moduleContract.read.QUEUE_LOWEST_PRIORITY();
    const pointers = await Promise.all(
      [...bigIntRange(queuesCount)].map((i) =>
        this.moduleContract.read.depositQueuePointers([i]),
      ),
    );
    return pointers.map(([head, tail]) => ({ head, tail }));
  }

  @Logger('API:')
  @ErrorHandler()
  public async getUsedOtherModule(address: Address): Promise<string | null> {
    const keysApi = this.core.keysApiLink;
    const csmId = this.core.moduleId;

    const { data: modules } = await fetchJson<ModulesResponse>(
      `${keysApi}/v1/modules`,
      {
        headers: { 'Content-Type': 'application/json' },
      },
    ).catch(() => ({ data: [] }));

    const results = await Promise.all(
      modules.map(({ id }) =>
        id === csmId
          ? undefined
          : fetchJson<ModuleOperatorsResponse>(
              `${keysApi}/v1/modules/${id}/operators`,
            ).catch(() => undefined),
      ),
    );
    const operators = results.flatMap((r) => r?.data.operators || []);

    const matchedOperator = operators.find((o) =>
      isAddressEqual(o.rewardAddress as Address, address),
    );
    const matchedModule =
      matchedOperator &&
      modules.find((m) =>
        isAddressEqual(
          m.stakingModuleAddress as Address,
          matchedOperator.moduleAddress as Address,
        ),
      );

    return matchedModule?.name ?? null;
  }
}
