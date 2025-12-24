import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger, Cache } from '../common/decorators/index.js';
import { CACHE_LONG, CACHE_SHORT } from '../common/index.js';
import { CurrentFrameInfo, FrameConfig, FrameInfo } from './types.js';
import {
  getFrameDuration,
  getSlotsPerFrame,
  slotToEpoch,
  slotToTimestamp,
  timestampToSlot,
} from './utils.js';

export class FrameSDK extends CsmSDKModule {
  private get oracleContract() {
    return this.core.contractFeeOracle;
  }

  private get consensusContract() {
    return this.core.contractHashConsensus;
  }

  @Logger('Views:')
  @Cache(CACHE_SHORT)
  @ErrorHandler()
  public async getLastProcessedRefSlot(): Promise<bigint> {
    return this.oracleContract.read.getLastProcessingRefSlot();
  }

  @Logger('Views:')
  @Cache(CACHE_SHORT)
  @ErrorHandler()
  public async getLatestBlock() {
    return this.core.publicClient.getBlock({ blockTag: 'latest' });
  }

  @Logger('Views:')
  @Cache(CACHE_LONG)
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
  public async getCurrentEpoch(): Promise<bigint> {
    const [config, { timestamp: latestBlockTimestamp }] = await Promise.all([
      this.getConfig(),
      this.getLatestBlock(),
    ]);

    const latestSlot = timestampToSlot(latestBlockTimestamp, config);
    return slotToEpoch(latestSlot, config);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getCurrentFrame(): Promise<CurrentFrameInfo> {
    const [config, lastRefSlot, { timestamp: latestBlockTimestamp }] =
      await Promise.all([
        this.getConfig(),
        this.getLastProcessedRefSlot(),
        this.getLatestBlock(),
      ]);

    const slotsPerFrame = getSlotsPerFrame(config);
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
