import { GetContractReturnType, WalletClient } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  DepositQueuePointer,
  DepositQueueBatch,
  RawDepositQueueBatch,
} from './types.js';
import { filterBatches } from './filter-batches.js';
import { parseBatch } from './parse-batch.js';

export class DepositQueueSDK extends CsmSDKModule {
  protected get contract(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.core.getContractCSModule();
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 60 * 1000)
  public async getLowestPriorityQueue(): Promise<bigint> {
    return this.contract.read.QUEUE_LOWEST_PRIORITY();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getQueuePointers(
    queuePriority: number,
  ): Promise<DepositQueuePointer> {
    const [head, tail] = await this.contract.read.depositQueuePointers([
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
  ): Promise<RawDepositQueueBatch> {
    return this.contract.read
      .depositQueueItem([BigInt(queuePriority), batchIndex])
      .then((rawBatch) => parseBatch(rawBatch, batchIndex));
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBatchesInQueue(
    queuePriority: number,
  ): Promise<DepositQueueBatch[]> {
    const { head, tail } = await this.getQueuePointers(queuePriority);
    // console.log(`>> get batches for ${queuePriority}: [${head}..${tail}]`);

    if (head === tail) {
      return [];
    }

    const allBatches = await Promise.all(
      Array.from({ length: Number(tail - head) }, (_, i) =>
        this.getBatchInQueue(queuePriority, BigInt(i) + head),
      ),
    );

    // console.log(`>> batches for ${queuePriority}:`, allBatches);

    const activeBatches = filterBatches(allBatches);

    // console.log(`>> active batches for ${queuePriority}:`, activeBatches);

    return activeBatches;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getAllBatches(): Promise<DepositQueueBatch[][]> {
    const lowestPriorityQueue = await this.getLowestPriorityQueue();
    // console.log('>> lowestPriorityQueue:', lowestPriorityQueue);

    const queueBatches = await Promise.all(
      Array.from({ length: Number(lowestPriorityQueue) + 1 }, (_, priority) =>
        this.getBatchesInQueue(priority),
      ),
    );

    return queueBatches;
  }
}
