import { Address, isAddressEqual } from 'viem';
import { VersionCheckAbi } from '../abi/VersionCheck.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CACHE_MID, CONTRACT_NAMES } from '../common/index.js';
import { fetchJson } from '../common/utils/fetch-json.js';
import { onVersionError } from '../common/utils/on-error.js';
import { calculateShareLimit } from './calculate-share-limit.js';
import { findModuleDigest } from './find-module-digest.js';
import {
  CsmStatus,
  ModuleDigest,
  ModuleOperatorsResponse,
  ModulesResponse,
  ShareLimitInfo,
  ShareLimitStatus,
} from './types.js';

export class ModuleSDK extends CsmSDKModule {
  private get moduleContract() {
    return this.core.contractBaseModule;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getStatus(): Promise<CsmStatus> {
    const csAccounting = this.core.contractAccounting;

    const [isPausedModule, isPausedAccounting] = await Promise.all([
      this.moduleContract.read.isPaused(),
      csAccounting.read.isPaused(),
    ]);

    return {
      isPausedModule,
      isPausedAccounting,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getVersions(): Promise<Record<CONTRACT_NAMES, bigint>> {
    const contractNames = Object.keys(this.core.supportedVersions) as CONTRACT_NAMES[];

    const versionPromises = contractNames.map((contractName) =>
      this.core
        .getContractWithAbi(contractName, VersionCheckAbi)
        .read.getInitializedVersion()
        .catch(onVersionError)
        .then((v) => [contractName, v] as const),
    );

    const versions = await Promise.all(versionPromises);

    return Object.fromEntries(
      versions.filter(([, version]) => version !== 0n),
    ) as Record<CONTRACT_NAMES, bigint>;
  }

  public async isVersionsSupported(): Promise<boolean> {
    const versions = await this.getVersions();

    return Object.entries(this.core.supportedVersions)
      .map(([key, [min, max]]) => {
        const current = versions[key as CONTRACT_NAMES];
        return current !== undefined && current >= min && current <= max;
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
      await this.core.contractStakingRouter.read.getAllStakingModuleDigests();
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
