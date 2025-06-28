import { ERROR_CODE, invariant } from '@lidofinance/lido-ethereum-sdk';
import { GetContractReturnType, WalletClient } from 'viem';
import { StakingRouterAbi } from '../abi/StakingRouter.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache } from '../common/decorators/cache.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import { ShareLimitInfo, ShareLimitStatus } from './types.js';
import { MODULE_ID_BY_CHAIN, PERCENT_BASIS } from '../common/index.js';

export class StakingRouterSDK extends CsmSDKModule {
  private get contract(): GetContractReturnType<
    typeof StakingRouterAbi,
    WalletClient
  > {
    return this.core.getContractStakingRouter();
  }

  @Logger('Views:')
  @ErrorHandler()
  private async getAllModulesDigests() {
    return this.contract.read.getAllStakingModuleDigests();
  }

  private calculateShareLimit(
    digests: Awaited<ReturnType<typeof this.getAllModulesDigests>>,
  ): ShareLimitInfo {
    const moduleId = MODULE_ID_BY_CHAIN[this.core.chainId];
    invariant(
      moduleId,
      `CSM moduleId is not specified for ${this.core.chain.name}(${this.core.chain.id})`,
      ERROR_CODE.NOT_SUPPORTED,
    );

    const moduleDigest = digests.find((digest) => digest.state.id === moduleId);
    invariant(
      moduleDigest,
      `CSM module (${moduleId}) is not connected to StakingRouter`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    const shareLimit = BigInt(moduleDigest.state.stakeShareLimit);

    const active =
      moduleDigest.summary.totalDepositedValidators -
      moduleDigest.summary.totalExitedValidators;

    const queue = moduleDigest.summary.depositableValidatorsCount;

    const totalActive = digests.reduce(
      (acc, { summary }) =>
        acc + summary.totalDepositedValidators - summary.totalExitedValidators,
      0n,
    );

    const capacity = (totalActive * shareLimit) / PERCENT_BASIS;

    const activeLeft = capacity - active;


    return {
      active,
      activeLeft,
      capacity,
      queue,
      shareLimit,
    };
  }

  @Logger('Utils:')
  @Cache(10 * 60 * 1000)
  public async getShareLimit(): Promise<ShareLimitInfo> {
    const digests = await this.getAllModulesDigests();
    return this.calculateShareLimit(digests);
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
}
