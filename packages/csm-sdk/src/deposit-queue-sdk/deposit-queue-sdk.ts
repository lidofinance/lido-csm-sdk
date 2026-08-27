import { Hex } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  CACHE_LONG,
  CONTRACT_NAMES,
  DEFAULT_CLEAN_MAX_ITEMS,
} from '../common/constants/index';
import {
  Access,
  AccessLevel,
  Cache,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import { TOP_UP_MODULES } from '../common/index';
import { NodeOperatorId } from '../common/types';
import { bigIntRange } from '../common/utils/bigint-range';
import {
  byTotalCount,
  iteratePages,
  onePage,
  Pagination,
} from '../discovery-sdk/index';
import { ModuleSDK } from '../module-sdk/module-sdk';
import { OperatorSDK } from '../operator-sdk/operator-sdk';
import { TxSDK } from '../tx-sdk/index';
import { CommonTransactionProps } from '../tx-sdk/types';
import { buildTopUpPositions } from './build-top-up-positions';
import { filterEmptyBatches } from './filter-batches';
import { byNextBatchIndex } from './next-batch-index';
import { parseBatch } from './parse-batch';
import { selectOperatorQueueKeys } from './select-operator-queue-keys';
import {
  DepositQueueBatch,
  DepositQueuePointer,
  OperatorTopUpQueue,
  QueueBatchesPagination,
  RawDepositQueueBatch,
  RawDepositQueueBatchWithIndex,
  TopUpQueueEntry,
  TopUpQueueInfo,
} from './types';

export class DepositQueueSDK extends CsmSDKModule<{
  tx: TxSDK;
  module: ModuleSDK;
  operator: OperatorSDK;
}> {
  private get moduleContract() {
    return this.core.getContract(CONTRACT_NAMES.csModule);
  }

  private get parametersRegistryContract() {
    return this.core.getContract(CONTRACT_NAMES.parametersRegistry);
  }

  private get discoveryContract() {
    return this.core.getContract(CONTRACT_NAMES.smDiscovery);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_LONG)
  public async getLowestPriorityQueue(): Promise<bigint> {
    return this.parametersRegistryContract.read.QUEUE_LOWEST_PRIORITY();
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
        this.discoveryContract.read.getNodeOperatorsDepositableValidatorsCount([
          this.core.moduleId,
          p.offset,
          p.limit,
        ]),
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
    const result = await this.discoveryContract.read.getDepositQueueBatches([
      this.core.moduleId,
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

  /** Raw top-up queue state, including `limit` and `head`. Safe when disabled. */
  @Logger('Views:')
  @ErrorHandler()
  public async getTopUpQueueInfo(): Promise<TopUpQueueInfo> {
    const [enabled, limit, length, head] =
      await this.moduleContract.read.getTopUpQueue();
    return { enabled, limit, length, head };
  }

  /**
   * Queue entries in FIFO order, 0-based ordinal `position` (not an ETA).
   * `pagination.offset` is a client-side slice — `getKeysForTopUp` has no offset param.
   */
  @Logger('Views:')
  @ErrorHandler()
  public async getTopUpQueueKeys(
    pagination?: Pagination,
  ): Promise<TopUpQueueEntry[]> {
    const { enabled, length } = await this.getTopUpQueueInfo();
    if (!enabled || length === 0n) return [];

    if (!pagination) {
      const pubkeys = await this.moduleContract.read.getKeysForTopUp([length]);
      return pubkeys.map((pubkey, position) => ({ pubkey, position }));
    }

    const { offset, limit } = pagination;
    const fetchCount = offset + limit < length ? offset + limit : length;
    const pubkeys = await this.moduleContract.read.getKeysForTopUp([
      fetchCount,
    ]);

    return pubkeys.slice(Number(offset)).map((pubkey, i) => ({
      pubkey,
      position: Number(offset) + i,
    }));
  }

  /** Current queue length, or 0 when disabled or on a non-top-up module. */
  @Logger('Views:')
  @ErrorHandler()
  public async getTopUpQueueSize(): Promise<number> {
    if (!TOP_UP_MODULES.has(this.core.moduleName)) return 0;

    const { enabled, length } = await this.getTopUpQueueInfo();
    return enabled ? Number(length) : 0;
  }

  /** pubkey (lowercased) → 0-based queue position. Duplicate pubkey keeps the earliest position. */
  @Logger('Utils:')
  @ErrorHandler()
  public async getTopUpPositions(): Promise<Map<Hex, number>> {
    const entries = await this.getTopUpQueueKeys();
    return buildTopUpPositions(entries.map(({ pubkey }) => pubkey));
  }

  /**
   * This operator's queued keys plus queue size, read from one snapshot.
   * Never pair `total` from a separate call — reading them apart can straddle
   * an `allocateDeposits` and render e.g. `#13/12`.
   */
  @Logger('Utils:')
  @ErrorHandler()
  public async getOperatorTopUpQueue(
    id: NodeOperatorId,
  ): Promise<OperatorTopUpQueue> {
    if (!TOP_UP_MODULES.has(this.core.moduleName))
      return { total: 0, keys: [] };

    const [entries, operatorKeys] = await Promise.all([
      this.getTopUpQueueKeys(),
      this.bus.operator.getKeys(id),
    ]);

    const positions = buildTopUpPositions(entries.map(({ pubkey }) => pubkey));

    return {
      total: entries.length,
      keys: selectOperatorQueueKeys(operatorKeys, positions),
    };
  }

  @Access({ level: AccessLevel.ANYONE })
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
        this.moduleContract.encode.cleanDepositQueue([
          BigInt(maxItems ?? DEFAULT_CLEAN_MAX_ITEMS),
        ]),
    });
  }

  @Access({ level: AccessLevel.ANYONE })
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
        this.moduleContract.encode.updateDepositableValidatorsCount([
          nodeOperatorId,
        ]),
    });
  }
}
