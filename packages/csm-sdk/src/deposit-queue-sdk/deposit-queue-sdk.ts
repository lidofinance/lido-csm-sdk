import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import {
  CACHE_LONG,
  CONTRACT_NAMES,
  DEFAULT_CLEAN_MAX_ITEMS,
} from '../common/constants/index.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { NodeOperatorId } from '../common/types.js';
import { bigIntRange } from '../common/utils/bigint-range.js';
import {
  byTotalCount,
  iteratePages,
  onePage,
  Pagination,
} from '../discovery-sdk/index.js';
import { ModuleSDK } from '../module-sdk/module-sdk.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { CommonTransactionProps } from '../tx-sdk/types.js';
import { filterEmptyBatches } from './filter-batches.js';
import { byNextBatchIndex } from './next-batch-index.js';
import { parseBatch } from './parse-batch.js';
import {
  DepositQueueBatch,
  DepositQueuePointer,
  QueueBatchesPagination,
  RawDepositQueueBatch,
  RawDepositQueueBatchWithIndex,
} from './types.js';

export class DepositQueueSDK extends CsmSDKModule<{
  tx: TxSDK;
  module: ModuleSDK;
}> {
  private get moduleContract() {
    return this.core.getContract(CONTRACT_NAMES.csModule);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_LONG)
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
      [...bigIntRange(queuesCount)].map((i) =>
        this.getQueuePointers(Number(i)),
      ),
    );
  }

  @Logger('Views:')
  @ErrorHandler()
  private async getNodeOperatorsDepositableKeysCount(
    pagination?: Pagination,
  ): Promise<number[]> {
    const getNextOffset = pagination
      ? onePage
      : byTotalCount(await this.bus.module.getOperatorsCount());

    return iteratePages(
      (p) =>
        this.core.contractSMDiscovery.read.getNodeOperatorsDepositableValidatorsCount(
          [BigInt(this.core.moduleId), p.offset, p.limit],
        ),
      pagination,
      getNextOffset,
    );
  }

  @Logger('Views:')
  @ErrorHandler()
  private async getQueueBatchesPage(
    queuePriority: number,
    pagination?: QueueBatchesPagination,
  ): Promise<bigint[]> {
    const result =
      await this.core.contractSMDiscovery.read.getDepositQueueBatches([
        BigInt(this.core.moduleId),
        BigInt(queuePriority),
        pagination?.cursorIndex ?? 0n,
        pagination?.limit ?? 1000n,
      ]);

    return result as bigint[];
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
        const batches = await this.getQueueBatchesPage(queuePriority, {
          cursorIndex,
          limit,
        });
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
      [...bigIntRange(lowestPriorityQueue + 1n)].map((priority) =>
        this.getBatchesInQueue(Number(priority)),
      ),
    );

    const depositableKeysCount =
      await this.getNodeOperatorsDepositableKeysCount();

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

  @Logger('Call:')
  @ErrorHandler()
  public async normalize(
    props: CommonTransactionProps & {
      nodeOperatorId: NodeOperatorId;
    },
  ) {
    const { nodeOperatorId, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'updateDepositableValidatorsCount', [
          nodeOperatorId,
        ]),
    });
  }
}
