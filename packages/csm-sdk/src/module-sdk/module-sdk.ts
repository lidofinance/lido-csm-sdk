import { Address, isAddressEqual } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CACHE_MID,
  CONTRACT_NAMES,
  MODULE_CONTRACT,
} from '../common/index.js';
import { fetchJson } from '../common/utils/fetch-json.js';
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

  private get stakingRouterContract() {
    return this.core.getContract(CONTRACT_NAMES.stakingRouter);
  }

  private get accountingContract() {
    return this.core.getContract(CONTRACT_NAMES.accounting);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getStatus(): Promise<CsmStatus> {
    const csAccounting = this.accountingContract;

    const [isPausedModule, isPausedAccounting] = await Promise.all([
      this.moduleContract.read.isPaused(),
      csAccounting.read.isPaused(),
    ]);

    return {
      isPausedModule,
      isPausedAccounting,
    };
  }

  public async isVersionsSupported(): Promise<boolean> {
    const results = await Promise.all([
      this.core.checkContractVersion(MODULE_CONTRACT[this.core.moduleName]),
      this.core.checkContractVersion(CONTRACT_NAMES.accounting),
    ]);
    return results.every((r) => r.supported);
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
        id: BigInt(digest.state.id),
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

  @Cache(CACHE_LONG)
  @Logger('Views:')
  @ErrorHandler()
  public async getWithdrawalCredentialsType(): Promise<number> {
    const digest = await this.getDigest();
    return digest.state.withdrawalCredentialsType;
  }

  @Cache(CACHE_LONG)
  @Logger('Views:')
  @ErrorHandler()
  public async getMaxEffectiveBalance(): Promise<bigint> {
    const wcType = await this.getWithdrawalCredentialsType();
    const method =
      wcType === 1
        ? 'MAX_EFFECTIVE_BALANCE_WC_TYPE_01'
        : 'MAX_EFFECTIVE_BALANCE_WC_TYPE_02';
    return this.stakingRouterContract.read[method]();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getWcPrefix(): Promise<string> {
    const wcType = await this.getWithdrawalCredentialsType();
    return wcType.toString(16).padStart(2, '0').padEnd(24, '0');
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

    const margin = info.activeLeft - info.queue;

    if (info.activeLeft <= 0) return ShareLimitStatus.REACHED;
    if (margin < 0) return ShareLimitStatus.EXHAUSTED;
    if (margin < shareLimitThreshold) return ShareLimitStatus.APPROACHING;
    return ShareLimitStatus.FAR;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBalance(): Promise<bigint> {
    return this.stakingRouterContract.read.getStakingModuleBalance([
      this.core.moduleId,
    ]);
  }

  // TODO: review
  @Logger('API:')
  @ErrorHandler()
  public async getUsedOtherModule(address: Address): Promise<string | null> {
    const { data: modules } = await fetchJson<ModulesResponse>(
      `${this.core.keysApiLink}/v1/modules`,
      {
        headers: { 'Content-Type': 'application/json' },
      },
    ).catch(() => ({ data: [] }));

    const results = await Promise.all(
      modules.map(({ id }) =>
        BigInt(id) === this.core.moduleId
          ? undefined
          : fetchJson<ModuleOperatorsResponse>(
              `${this.core.keysApiLink}/v1/modules/${id}/operators`,
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
