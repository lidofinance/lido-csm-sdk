import { GetContractReturnType, WalletClient } from 'viem';
import { CSFeeOracleAbi } from '../abi/CSFeeOracle.js';
import { HashConsensusAbi } from '../abi/HashConsensus.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { CurrentFrameInfo, FrameInfo } from './types.js';

export class FrameSDK extends CsmSDKModule {
  private get oracleContract(): GetContractReturnType<
    typeof CSFeeOracleAbi,
    WalletClient
  > {
    return this.core.getContractCSFeeOracle();
  }

  private get consensusContract(): GetContractReturnType<
    typeof HashConsensusAbi,
    WalletClient
  > {
    return this.core.getContractHashConsensus();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getInfo(): Promise<FrameInfo> {
    const [
      [slotsPerEpoch, secondsPerSlot, genesisTime],
      [, epochsPerFrame],
      lastRefSlot,
    ] = await Promise.all([
      this.consensusContract.read.getChainConfig(),
      this.consensusContract.read.getFrameConfig(),
      this.oracleContract.read.getLastProcessingRefSlot(),
    ]);

    const lastDistribution = lastRefSlot * secondsPerSlot + genesisTime;

    const frameDuration = epochsPerFrame * slotsPerEpoch * secondsPerSlot;

    return {
      lastReport: Number(lastDistribution),
      frameDuration: Number(frameDuration),
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getCurentFrame(): Promise<CurrentFrameInfo> {
    const [
      [slotsPerEpoch, secondsPerSlot, genesisTime],
      [, epochsPerFrame],
      lastRefSlot,
      { timestamp: latestBlockTimestamp },
    ] = await Promise.all([
      this.consensusContract.read.getChainConfig(),
      this.consensusContract.read.getFrameConfig(),
      this.oracleContract.read.getLastProcessingRefSlot(),
      this.core.client.getBlock({ blockTag: 'latest' }),
    ]);

    const latestSlot = (latestBlockTimestamp - genesisTime) / secondsPerSlot;
    const slotsPerFrame = epochsPerFrame * slotsPerEpoch;

    const startSlot =
      ((latestSlot - lastRefSlot) / slotsPerFrame) * slotsPerFrame +
      lastRefSlot;
    const startTimestamp = startSlot * secondsPerSlot + genesisTime;
    const endTimestamp =
      (startSlot + epochsPerFrame * slotsPerEpoch) * secondsPerSlot +
      genesisTime;
    const numberEpochs = (latestSlot - startSlot) / slotsPerEpoch;

    return {
      now: Number(latestBlockTimestamp),
      start: Number(startTimestamp),
      end: Number(endTimestamp),
      passEpochs: Number(numberEpochs),
    };
  }
}
