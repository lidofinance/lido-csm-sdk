import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger, Cache } from '../common/decorators/index.js';
import { CurrentFrameInfo, FrameConfig, FrameInfo } from './types.js';
import {
  getFrameDuration,
  getStotsPerFrame,
  slotToEpoch,
  slotToTimestamp,
  timestampToSlot,
} from './utils.js';

export class FrameSDK extends CsmSDKModule {
  private get oracleContract() {
    return this.core.contractCSFeeOracle;
  }

  private get consensusContract() {
    return this.core.contractHashConsensus;
  }

  @Logger('Views:')
  @Cache(60 * 1000)
  @ErrorHandler()
  public async getLastProcessedRefSlot(): Promise<bigint> {
    return this.oracleContract.read.getLastProcessingRefSlot();
  }

  @Logger('Views:')
  @Cache(30 * 60 * 1000)
  @ErrorHandler()
  public async getConfig(): Promise<FrameConfig> {
    const [[slotsPerEpoch, secondsPerSlot, genesisTime], [, epochsPerFrame]] =
      await Promise.all([
        this.consensusContract.read.getChainConfig(),
        this.consensusContract.read.getFrameConfig(),
      ]);

    return {
      slotsPerEpoch,
      secondsPerSlot,
      genesisTime,
      epochsPerFrame,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getInfo(): Promise<FrameInfo> {
    const [config, lastRefSlot] = await Promise.all([
      this.getConfig(),
      this.getLastProcessedRefSlot(),
    ]);

    const lastReport = slotToTimestamp(lastRefSlot, config);
    const frameDuration = getFrameDuration(config);

    return {
      lastReport,
      frameDuration,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getCurentFrame(): Promise<CurrentFrameInfo> {
    const [config, lastRefSlot, { timestamp: latestBlockTimestamp }] =
      await Promise.all([
        this.getConfig(),
        this.getLastProcessedRefSlot(),
        this.core.publicClient.getBlock({ blockTag: 'latest' }),
      ]);

    const slotsPerFrame = getStotsPerFrame(config);
    const latestSlot = timestampToSlot(latestBlockTimestamp, config);

    const startSlot =
      ((latestSlot - lastRefSlot) / slotsPerFrame) * slotsPerFrame +
      lastRefSlot;
    const startTimestamp = slotToTimestamp(startSlot, config);
    const endTimestamp = slotToTimestamp(startSlot + slotsPerFrame, config);
    const numberEpochs = slotToEpoch(latestSlot - startSlot, config);

    return {
      start: startTimestamp,
      end: endTimestamp,
      now: Number(latestBlockTimestamp),
      passEpochs: Number(numberEpochs),
    };
  }
}
