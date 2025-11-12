import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { DEFAULT_CLEAN_MAX_ITEMS } from '../common/constants/index.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CommonTransactionProps } from '../tx-sdk/types.js';
import {
  byNextBatchIndex,
  iteratePages,
  SatelliteSDK,
} from '../satellite-sdk/index.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { filterEmptyBatches } from './filter-batches.js';
import { parseBatch } from './parse-batch.js';
import {
  DepositQueueBatch,
  DepositQueuePointer,
  RawDepositQueueBatch,
  RawDepositQueueBatchWithIndex,
} from './types.js';

export class DepositQueueSDK extends CsmSDKModule<{
  tx: TxSDK;
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
    const { head, tail } = await this.getQueuePointers(queuePriority);

    if (head === tail) {
      return [];
    }

    return iteratePages(
      async ({ offset: cursorIndex, limit }) => {
        const batches = await this.bus.satellite.getQueueBatchesPage(
          queuePriority,
          { cursorIndex, limit },
        );
        return batches.map(parseBatch);
      },
      undefined,
      byNextBatchIndex(tail),
    );
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

    const depositableKeysCount =
      await this.bus.satellite.getNodeOperatorsDepositableKeysCount();

    return filterEmptyBatches(queueBatches, depositableKeysCount);
  }

  @Logger('Call:')
  @ErrorHandler()
  public async clean(
    props: CommonTransactionProps & {
      maxItems?: number;
    } = {},
  ) {
    const { maxItems, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'cleanDepositQueue', [
          BigInt(maxItems ?? DEFAULT_CLEAN_MAX_ITEMS),
        ]),
    });
  }
}
