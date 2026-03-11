import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache } from '../common/decorators/cache.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import {
  CACHE_LONG,
  CACHE_MID,
  CONTRACT_NAMES,
  PERCENT_BASIS,
} from '../common/index.js';
import { ModuleSDK } from '../module-sdk/module-sdk.js';
import { CurveParameters, KeyNumberValueInterval } from './types.js';

export class ParametersSDK extends CsmSDKModule<{ module: ModuleSDK }> {
  private get parametersContract() {
    return this.core.getContract(CONTRACT_NAMES.parametersRegistry);
  }

  private get accountingContract() {
    return this.core.getContract(CONTRACT_NAMES.accounting);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_LONG)
  public async getCurvesCount(): Promise<bigint> {
    return this.accountingContract.read.getCurvesCount();
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getDefaultCurveId(): Promise<bigint> {
    return this.accountingContract.read.DEFAULT_BOND_CURVE_ID();
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getBondConfig(
    curveId: bigint,
  ): Promise<KeyNumberValueInterval[]> {
    const { intervals } = await this.accountingContract.read.getCurveInfo([
      curveId,
    ]);
    return intervals.map(({ minKeysCount, trend }) => ({
      minKeyNumber: Number(minKeysCount),
      value: trend,
    }));
  }

  @Logger('Utils:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getAll(curveId: bigint): Promise<CurveParameters> {
    const [params, bondConfig, lowestPriority, digest] = await Promise.all([
      this.parametersContract.read.getCurveParameters([curveId]),
      this.getBondConfig(curveId),
      this.parametersContract.read.QUEUE_LOWEST_PRIORITY(),
      this.bus.module.getDigest(),
    ]);

    return {
      keyRemovalFee: params.keyRemovalCharge,
      keysLimit: Number(params.keysLimit),
      allowedExitDelay: Number(params.allowedExitDelay),
      exitDelayPenalty: params.exitDelayFee,
      badPerformancePenalty: params.badPerformancePenalty,
      elStealingPenalty: params.generalDelayedPenaltyAdditionalFine,
      maxWithdrawalRequestFee: params.maxElWithdrawalRequestFee,
      performanceCoefficients: {
        attestationsWeight: params.attestationsWeight,
        blocksWeight: params.blocksWeight,
        syncWeight: params.syncWeight,
      },
      performanceLeewayConfig: params.performanceLeewayData.map((item) => ({
        minKeyNumber: Number(item.minKeyNumber),
        value: item.value,
      })) as KeyNumberValueInterval[],
      rewardsConfig: params.rewardShareData.map((item) => ({
        minKeyNumber: Number(item.minKeyNumber),
        value: (item.value * digest.state.stakingModuleFee) / PERCENT_BASIS,
      })) as KeyNumberValueInterval[],
      bondConfig,
      queueConfig: {
        priority: params.queuePriority,
        maxDeposits: params.queueMaxDeposits,
        lowestPriority: Number(lowestPriority),
      },
      strikesConfig: {
        lifetime: Number(params.strikesLifetime),
        threshold: Number(params.strikesThreshold),
      },
    };
  }
}
