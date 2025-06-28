import { GetContractReturnType, WalletClient } from 'viem';
import { CSAccountingAbi } from '../abi/CSAccounting.js';
import { CSParametersRegistryAbi } from '../abi/CSParametersRegistry.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import {
  CurveParameters,
  KeyNumberValueInterval,
  PerformanceCoefficients,
  QueueConfig,
  StrikesConfig,
} from './types.js';

export class ParametersSDK extends CsmSDKModule {
  protected get contract(): GetContractReturnType<
    typeof CSParametersRegistryAbi,
    WalletClient
  > {
    return this.core.getContractCSParametersRegistry();
  }

  protected get accountingContract(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.core.getContractCSAccounting();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getKeyRemovalFee(curveId: bigint): Promise<bigint> {
    return this.contract.read.getKeyRemovalCharge([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getMaxWithdrawalRequestFee(curveId: bigint): Promise<bigint> {
    return this.contract.read.getMaxWithdrawalRequestFee([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getKeysLimit(curveId: bigint): Promise<bigint> {
    return this.contract.read.getKeysLimit([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getELStealingPenalty(curveId: bigint): Promise<bigint> {
    return this.contract.read.getElRewardsStealingAdditionalFine([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBadPerformancePenalty(curveId: bigint): Promise<bigint> {
    return this.contract.read.getBadPerformancePenalty([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getExitDelayPenalty(curveId: bigint): Promise<bigint> {
    return this.contract.read.getExitDelayPenalty([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getAllowedExitDelay(curveId: bigint): Promise<bigint> {
    return this.contract.read.getAllowedExitDelay([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getRewardsShare(
    curveId: bigint,
  ): Promise<KeyNumberValueInterval[]> {
    return (await this.contract.read.getRewardShareData([
      curveId,
    ])) as KeyNumberValueInterval[];
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getPerformanceLewayConfig(
    curveId: bigint,
  ): Promise<KeyNumberValueInterval[]> {
    return (await this.contract.read.getPerformanceLeewayData([
      curveId,
    ])) as KeyNumberValueInterval[];
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getPerformanceCoefficients(
    curveId: bigint,
  ): Promise<PerformanceCoefficients> {
    const [attestationsWeight, blocksWeight, syncWeight] =
      await this.contract.read.getPerformanceCoefficients([curveId]);
    return { attestationsWeight, blocksWeight, syncWeight };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getStrikesConfig(curveId: bigint): Promise<StrikesConfig> {
    const [lifetime, threshold] = await this.contract.read.getStrikesParams([
      curveId,
    ]);
    return { lifetime, threshold };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getQueueConfig(curveId: bigint): Promise<QueueConfig> {
    const [[priority, maxDeposits], lowestPriority] = await Promise.all([
      this.contract.read.getQueueConfig([curveId]),
      this.contract.read.QUEUE_LOWEST_PRIORITY(),
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
      minKeyNumber: minKeysCount,
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
