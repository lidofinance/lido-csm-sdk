import { Address } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CACHE_LONG, CACHE_MID, CONTRACT_NAMES } from '../common/index.js';
import { calculateShareLimit } from './calculate-share-limit.js';
import { findModuleDigest } from './find-module-digest.js';
import { findUsedOtherModule } from './find-used-other-module.js';
import { CsmStatus, ModuleDigest, ShareLimitInfo } from './types.js';

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
      this.core.checkContractVersion(this.core.moduleContract),
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

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_LONG)
  public async getWithdrawalCredentialsType(): Promise<number> {
    const digest = await this.getDigest();
    return digest.state.withdrawalCredentialsType;
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_LONG)
  public async getMaxEffectiveBalance(): Promise<bigint> {
    const wcType = await this.getWithdrawalCredentialsType();
    const method =
      wcType === 1
        ? 'MAX_EFFECTIVE_BALANCE_WC_TYPE_01'
        : 'MAX_EFFECTIVE_BALANCE_WC_TYPE_02';
    return this.stakingRouterContract.read[method]();
  }

  @Logger('Utils:')
  public async getShareLimit(): Promise<ShareLimitInfo> {
    const digests = await this.getAllModulesDigests();
    return calculateShareLimit(digests, this.core.moduleId);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBalance(): Promise<bigint> {
    return this.stakingRouterContract.read.getStakingModuleBalance([
      this.core.moduleId,
    ]);
  }

  @Logger('API:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getUsedOtherModule(address: Address): Promise<string | null> {
    return findUsedOtherModule(
      this.core.keysApiLink,
      this.core.moduleId,
      address,
    );
  }
}
