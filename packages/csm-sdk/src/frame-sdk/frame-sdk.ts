import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger, Cache } from '../common/decorators/index.js';
import {
  CACHE_IMMUTABLE,
  CACHE_LONG,
  CACHE_SHORT,
  CONTRACT_NAMES,
} from '../common/index.js';
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
    return this.core.getContract(CONTRACT_NAMES.feeOracle);
  }

  private get consensusContract() {
    return this.core.getContract(CONTRACT_NAMES.hashConsensus);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_SHORT)
  public async getLastRefSlot(): Promise<bigint> {
    return this.oracleContract.read.getLastProcessingRefSlot();
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_IMMUTABLE)
  public async getInitialRefSlot(): Promise<bigint> {
    return this.consensusContract.read.getInitialRefSlot();
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_SHORT)
  public async getLatestBlock() {
    return this.core.publicClient.getBlock({ blockTag: 'latest' });
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_LONG)
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
      this.getLastRefSlot(),
    ]);
    const refSlot = lastRefSlot || (await this.getInitialRefSlot());

    const lastReport =
      lastRefSlot === 0n ? 0 : slotToTimestamp(lastRefSlot, config);
    const nextReport = slotToTimestamp(
      refSlot + getSlotsPerFrame(config),
      config,
    );
    const frameDuration = getFrameDuration(config);

    return {
      lastReport,
      nextReport,
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
        this.getLastRefSlot(),
        this.getLatestBlock(),
      ]);

    const slotsPerFrame = getSlotsPerFrame(config);
    const latestSlot = timestampToSlot(latestBlockTimestamp, config);

    const refSlot =
      lastRefSlot === 0n ? await this.getInitialRefSlot() : lastRefSlot;

    const startSlot =
      ((latestSlot - refSlot) / slotsPerFrame) * slotsPerFrame + refSlot;
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
