import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import { PERCENT_BASIS } from '../common/index.js';
import { ModuleSDK } from '../module-sdk/module-sdk.js';
import {
  CurveParameters,
  KeyNumberValueInterval,
  PerformanceCoefficients,
  QueueConfig,
  StrikesConfig,
} from './types.js';

export class ParametersSDK extends CsmSDKModule<{ module: ModuleSDK }> {
  private get parametersContract() {
    return this.core.contractCSParametersRegistry;
  }

  private get accountingContract() {
    return this.core.contractCSAccounting;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getKeyRemovalFee(curveId: bigint): Promise<bigint> {
    return this.parametersContract.read.getKeyRemovalCharge([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getMaxWithdrawalRequestFee(curveId: bigint): Promise<bigint> {
    return this.parametersContract.read.getMaxWithdrawalRequestFee([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getKeysLimit(curveId: bigint): Promise<number> {
    const keysLimit = await this.parametersContract.read.getKeysLimit([
      curveId,
    ]);
    return Number(keysLimit);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getELStealingPenalty(curveId: bigint): Promise<bigint> {
    return this.parametersContract.read.getElRewardsStealingAdditionalFine([
      curveId,
    ]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBadPerformancePenalty(curveId: bigint): Promise<bigint> {
    return this.parametersContract.read.getBadPerformancePenalty([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getExitDelayPenalty(curveId: bigint): Promise<bigint> {
    return this.parametersContract.read.getExitDelayPenalty([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getAllowedExitDelay(curveId: bigint): Promise<number> {
    const value = await this.parametersContract.read.getAllowedExitDelay([
      curveId,
    ]);
    return Number(value);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getRewardsShare(
    curveId: bigint,
  ): Promise<KeyNumberValueInterval[]> {
    const [rewardsShare, digest] = await Promise.all([
      this.parametersContract.read.getRewardShareData([curveId]),
      this.bus.getOrThrow('module').getDigest(),
    ]);

    return rewardsShare.map((item) => ({
      ...item,
      minKeyNumber: Number(item.minKeyNumber),
      value: (item.value * digest.state.stakingModuleFee) / PERCENT_BASIS,
    })) as KeyNumberValueInterval[];
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getPerformanceLewayConfig(
    curveId: bigint,
  ): Promise<KeyNumberValueInterval[]> {
    return (
      await this.parametersContract.read.getPerformanceLeewayData([curveId])
    ).map((item) => ({
      ...item,
      minKeyNumber: Number(item.minKeyNumber),
    })) as KeyNumberValueInterval[];
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getPerformanceCoefficients(
    curveId: bigint,
  ): Promise<PerformanceCoefficients> {
    const [attestationsWeight, blocksWeight, syncWeight] =
      await this.parametersContract.read.getPerformanceCoefficients([curveId]);
    return { attestationsWeight, blocksWeight, syncWeight };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getStrikesConfig(curveId: bigint): Promise<StrikesConfig> {
    const [lifetime, threshold] =
      await this.parametersContract.read.getStrikesParams([curveId]);
    return { lifetime: Number(lifetime), threshold: Number(threshold) };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getQueueConfig(curveId: bigint): Promise<QueueConfig> {
    const [[priority, maxDeposits], lowestPriority] = await Promise.all([
      this.parametersContract.read.getQueueConfig([curveId]),
      this.parametersContract.read.QUEUE_LOWEST_PRIORITY(),
    ]);
    return { priority, maxDeposits, lowestPriority: Number(lowestPriority) };
  }

  @Logger('Views:')
  @ErrorHandler()
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
  public async getAll(curveId: bigint): Promise<CurveParameters> {
    const [
      keyRemovalFee,
      keysLimit,
      allowedExitDelay,
      exitDelayPenalty,
      badPerformancePenalty,
      elStealingPenalty,
      maxWithdrawalRequestFee,
      performanceCoefficients,
      performanceLeewayConfig,
      rewardsConfig,
      bondConfig,
      queueConfig,
      strikesConfig,
    ] = await Promise.all([
      this.getKeyRemovalFee(curveId),
      this.getKeysLimit(curveId),
      this.getAllowedExitDelay(curveId),
      this.getExitDelayPenalty(curveId),
      this.getBadPerformancePenalty(curveId),
      this.getELStealingPenalty(curveId),
      this.getMaxWithdrawalRequestFee(curveId),
      this.getPerformanceCoefficients(curveId),
      this.getPerformanceLewayConfig(curveId),
      this.getRewardsShare(curveId),
      this.getBondConfig(curveId),
      this.getQueueConfig(curveId),
      this.getStrikesConfig(curveId),
    ]);

    return {
      keyRemovalFee,
      keysLimit,
      allowedExitDelay,
      exitDelayPenalty,
      badPerformancePenalty,
      elStealingPenalty,
      maxWithdrawalRequestFee,
      performanceCoefficients,
      performanceLeewayConfig,
      rewardsConfig,
      bondConfig,
      queueConfig,
      strikesConfig,
    };
  }
}
