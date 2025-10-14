import { TransactionResult } from '@lidofinance/lido-ethereum-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CommonTransactionProps } from '../core-sdk/types.js';
import { SatelliteSDK } from '../satellite-sdk/satellite-sdk.js';
import { filterEmptyBatches } from './filter-batches.js';
import { parseBatch } from './parse-batch.js';
import {
  DepositQueueBatch,
  DepositQueuePointer,
  RawDepositQueueBatch,
  RawDepositQueueBatchWithIndex,
} from './types.js';

export class DepositQueueSDK extends CsmSDKModule<{
  satellite: SatelliteSDK;
}> {
  private get moduleContract() {
    return this.core.contractCSModule;
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 60 * 1000)
  public async getLowestPriorityQueue(): Promise<bigint> {
    return this.moduleContract.read.QUEUE_LOWEST_PRIORITY();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getQueuePointers(
    queuePriority: number,
  ): Promise<DepositQueuePointer> {
    const [head, tail] = await this.moduleContract.read.depositQueuePointers([
      BigInt(queuePriority),
    ]);
    return { head, tail };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getQueuesPointers(): Promise<DepositQueuePointer[]> {
    const queuesCount = await this.getLowestPriorityQueue();
    return Promise.all(
      Array.from({ length: Number(queuesCount) }, (_, i) =>
        this.getQueuePointers(i),
      ),
    );
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBatchInQueue(
    queuePriority: number,
    batchIndex: bigint,
  ): Promise<RawDepositQueueBatchWithIndex> {
    return this.moduleContract.read
      .depositQueueItem([BigInt(queuePriority), batchIndex])
      .then((rawBatch) => ({ ...parseBatch(rawBatch), batchIndex }));
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBatchesInQueue(
    queuePriority: number,
  ): Promise<RawDepositQueueBatch[]> {
    const batches = await this.bus
      .getOrThrow('satellite')
      ?.getQueueBatches({ queuePriority });

    if (!batches) {
      return [];
    }

    return batches.map(parseBatch);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getAllBatches(): Promise<DepositQueueBatch[][]> {
    const lowestPriorityQueue = await this.getLowestPriorityQueue();

    const queueBatches = await Promise.all(
      Array.from({ length: Number(lowestPriorityQueue) + 1 }, (_, priority) =>
        this.getBatchesInQueue(priority),
      ),
    );

    const depositableKeysCount = await this.bus
      .getOrThrow('satellite')
      .getNodeOperatorsDepositableKeysCount();

    return filterEmptyBatches(queueBatches, depositableKeysCount);
  }

  @Logger('Call:')
  @ErrorHandler()
  public async clean(
    props: CommonTransactionProps & {
      maxItems?: number;
    } = {},
  ): Promise<TransactionResult> {
    const { maxItems, ...rest } = props;
    const args = [BigInt(maxItems ?? 1000)] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.moduleContract.estimateGas.cleanDepositQueue(args, options),
      sendTransaction: (options) =>
        this.moduleContract.write.cleanDepositQueue(args, options),
    });
  }
}
