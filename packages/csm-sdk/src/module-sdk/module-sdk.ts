import { Address, GetContractReturnType, WalletClient } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { StakingRouterAbi } from '../abi/StakingRouter.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CSM_CONTRACT_NAMES,
  SUPPORTED_VERSION_BY_CONTRACT,
} from '../common/index.js';
import { fetchJson } from '../common/utils/fetch-json.js';
import { calculateShareLimit } from './calculate-share-limit.js';
import { onError } from './on-error.js';
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

export class ModuleSDK extends CsmSDKModule {
  protected get contract(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.core.getContractCSModule();
  }

  private get stakingRouterContract(): GetContractReturnType<
    typeof StakingRouterAbi,
    WalletClient
  > {
    return this.core.getContractStakingRouter();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getStatus(): Promise<CsmStatus> {
    const csAccounting = this.core.getContractCSAccounting();
    const csModule = this.core.getContractCSModule();

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
      this.core
        .getContractCSModule()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractCSAccounting()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractCSFeeDistributor()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractCSParametersRegistry()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractCSStrikes()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractVettedGate()
        .read.getInitializedVersion()
        .catch(onError),
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
    return this.contract.read.getNodeOperatorsCount();
  }

  @Logger('Views:')
  @ErrorHandler()
  private async getAllModulesDigests() {
    return this.stakingRouterContract.read.getAllStakingModuleDigests();
  }

  @Logger('Utils:')
  @Cache(10 * 60 * 1000)
  public async getShareLimit(): Promise<ShareLimitInfo> {
    const digests = (await this.getAllModulesDigests()) as ModuleDigest[];
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
    const queuesCount = await this.contract.read.QUEUE_LOWEST_PRIORITY();
    const pointers = await Promise.all(
      Array.from({ length: Number(queuesCount) }, (_, i) =>
        this.contract.read.depositQueuePointers([BigInt(i)]),
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

    const matchedOperator = operators.find((o) => o.rewardAddress === address);
    const matchedModule =
      matchedOperator &&
      modules.find(
        (m) => m.stakingModuleAddress === matchedOperator.moduleAddress,
      );

    return matchedModule?.name ?? null;
  }
}
