import { Address, Hex } from 'viem';
import { CSModulev1EventsAbi } from '../abi/CSModuleV1Events.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CONTRACT_NAMES,
  NodeOperator,
  NodeOperatorId,
  NodeOperatorInvite,
} from '../common/index.js';
import {
  isDefined,
  isPropsDefined,
  isUnique,
  requestWithBlockStep,
  sortByBlockNumber,
} from '../common/utils/index.js';
import { BindedContract } from '../core-sdk/types.js';
import { ChangeAddressLog, reconstructInvites } from './reconstruct-invites.js';
import {
  NodeOperatorLog,
  reconstructOperators,
} from './reconstruct-operators.js';
import {
  EventRangeProps,
  OperatorCurveIdChange,
  PenaltyCancelled,
  PenaltyCompensated,
  PenaltyRecord,
  PenaltyReported,
  PenaltySettled,
} from './types.js';

type StepProps = { fromBlock: bigint; toBlock: bigint };

export class EventsSDK extends CsmSDKModule {
  private get moduleContract() {
    return this.core.contractBaseModule;
  }

  private get moduleContractV1(): BindedContract<typeof CSModulev1EventsAbi> {
    return this.core.getContractWithAbi(
      CONTRACT_NAMES.csModule,
      CSModulev1EventsAbi,
    );
  }

  private get oracleContract() {
    return this.core.contractFeeOracle;
  }

  private get accountingContract() {
    return this.core.contractAccounting;
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getNodeOperatorsByAddress(
    address: Address,
    options?: EventRangeProps,
  ): Promise<NodeOperator[]> {
    const logs = await this.queryEvents<NodeOperatorLog>(
      options,
      (s) =>
        this.moduleContract.getEvents.NodeOperatorAdded(
          { managerAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorAdded(
          { rewardAddress: address },
          s,
        ),
      (s) =>
        this.moduleContractV1.getEvents.NodeOperatorAdded(
          { managerAddress: address },
          s,
        ),
      (s) =>
        this.moduleContractV1.getEvents.NodeOperatorAdded(
          { rewardAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChanged(
          { oldAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChanged(
          { newAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChanged(
          { oldAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChanged(
          { newAddress: address },
          s,
        ),
    );

    return reconstructOperators(logs, address);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getInvitesByAddress(
    address: Address,
    options?: EventRangeProps,
  ): Promise<NodeOperatorInvite[]> {
    const logs = await this.queryEvents<ChangeAddressLog>(
      options,
      (s) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChanged(
          { newAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChanged(
          { newAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChangeProposed(
          { oldProposedAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChangeProposed(
          { oldProposedAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChangeProposed(
          { newProposedAddress: address },
          s,
        ),
      (s) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChangeProposed(
          { newProposedAddress: address },
          s,
        ),
    );

    return reconstructInvites(logs, address);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getRewardsReports(options?: EventRangeProps) {
    return this.queryEvents(options, (s) =>
      this.oracleContract.getEvents.ProcessingStarted(undefined, s),
    );
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getWithdrawalSubmittedKeys(
    nodeOperatorId: NodeOperatorId,
    options?: EventRangeProps,
  ): Promise<Hex[]> {
    const logs = await this.queryEvents(options, (s) =>
      this.moduleContract.getEvents.ValidatorWithdrawn({ nodeOperatorId }, s),
    );

    return logs.map((e) => e.args.pubkey).filter(isDefined);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getRequestedToExitKeys(
    nodeOperatorId: NodeOperatorId,
    options?: EventRangeProps,
  ): Promise<Hex[]> {
    const logs = await this.queryEvents(options, (s) =>
      this.core.contractValidatorsExitBusOracle.getEvents.ValidatorExitRequest(
        { nodeOperatorId, stakingModuleId: BigInt(this.core.moduleId) },
        s,
      ),
    );

    return logs.map((e) => e.args.validatorPubkey).filter(isDefined);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getOperatorsWithPenalties(
    options?: EventRangeProps,
  ): Promise<NodeOperatorId[]> {
    const logs = await this.queryEvents(options, (s) =>
      this.accountingContract.getEvents.BondLockChanged({}, s),
    );

    return logs
      .map((e) => e.args.nodeOperatorId)
      .filter(isUnique)
      .filter(isDefined)
      .sort((a, b) => Number(a - b));
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getOperatorCurveIdChanges(
    nodeOperatorId: NodeOperatorId,
    options?: EventRangeProps,
  ): Promise<OperatorCurveIdChange[]> {
    const logs = await this.queryEvents(options, (s) =>
      this.accountingContract.getEvents.BondCurveSet({ nodeOperatorId }, s),
    );

    return logs
      .map(({ args: { curveId }, blockNumber }) => ({ curveId, blockNumber }))
      .filter(isPropsDefined('curveId'));
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getPenalties(
    nodeOperatorId: NodeOperatorId,
    options?: EventRangeProps,
  ): Promise<PenaltyRecord[]> {
    const base = ({
      args,
      blockNumber,
      transactionHash,
    }: {
      args: { nodeOperatorId?: bigint };
      blockNumber: bigint;
      transactionHash: Hex;
    }) => ({
      nodeOperatorId: args.nodeOperatorId!,
      blockNumber,
      transactionHash,
    });

    const records = await this.queryEvents<Omit<PenaltyRecord, 'timestamp'>>(
      options,
      async (s) => {
        const logs =
          await this.moduleContract.getEvents.GeneralDelayedPenaltyReported(
            { nodeOperatorId },
            s,
          );
        return logs.map(
          (e): Omit<PenaltyReported, 'timestamp'> => ({
            ...base(e),
            type: 'reported',
            amount: e.args.amount!,
            penaltyType: e.args.penaltyType!,
            additionalFine: e.args.additionalFine!,
            details: e.args.details!,
          }),
        );
      },
      async (s) => {
        const logs =
          await this.moduleContractV1.getEvents.ELRewardsStealingPenaltyReported(
            { nodeOperatorId },
            s,
          );
        return logs.map(
          (e): Omit<PenaltyReported, 'timestamp'> => ({
            ...base(e),
            type: 'reported',
            amount: e.args.stolenAmount!,
          }),
        );
      },
      async (s) => {
        const logs =
          await this.moduleContract.getEvents.GeneralDelayedPenaltyCancelled(
            { nodeOperatorId },
            s,
          );
        return logs.map(
          (e): Omit<PenaltyCancelled, 'timestamp'> => ({
            ...base(e),
            type: 'cancelled',
            amount: e.args.amount!,
          }),
        );
      },
      async (s) => {
        const logs =
          await this.moduleContractV1.getEvents.ELRewardsStealingPenaltyCancelled(
            { nodeOperatorId },
            s,
          );
        return logs.map(
          (e): Omit<PenaltyCancelled, 'timestamp'> => ({
            ...base(e),
            type: 'cancelled',
            amount: e.args.amount!,
          }),
        );
      },
      async (s) => {
        const logs =
          await this.moduleContract.getEvents.GeneralDelayedPenaltyCompensated(
            { nodeOperatorId },
            s,
          );
        return logs.map(
          (e): Omit<PenaltyCompensated, 'timestamp'> => ({
            ...base(e),
            type: 'compensated',
            amount: e.args.amount!,
          }),
        );
      },
      async (s) => {
        const logs =
          await this.moduleContractV1.getEvents.ELRewardsStealingPenaltyCompensated(
            { nodeOperatorId },
            s,
          );
        return logs.map(
          (e): Omit<PenaltyCompensated, 'timestamp'> => ({
            ...base(e),
            type: 'compensated',
            amount: e.args.amount!,
          }),
        );
      },
      async (s) => {
        const logs =
          await this.moduleContract.getEvents.GeneralDelayedPenaltySettled(
            { nodeOperatorId },
            s,
          );
        return logs.map(
          (e): Omit<PenaltySettled, 'timestamp'> => ({
            ...base(e),
            type: 'settled',
          }),
        );
      },
      async (s) => {
        const logs =
          await this.moduleContractV1.getEvents.ELRewardsStealingPenaltySettled(
            { nodeOperatorId },
            s,
          );
        return logs.map(
          (e): Omit<PenaltySettled, 'timestamp'> => ({
            ...base(e),
            type: 'settled',
          }),
        );
      },
    );

    return this.withTimestamps(records) as Promise<PenaltyRecord[]>;
  }

  private async withTimestamps<T extends { blockNumber: bigint }>(
    records: T[],
  ): Promise<(T & { timestamp: bigint })[]> {
    const uniqueBlocks = [...new Set(records.map((r) => r.blockNumber))];
    const blocks = await Promise.all(
      uniqueBlocks.map(async (blockNumber) => {
        const block = await this.core.publicClient.getBlock({ blockNumber });
        return [blockNumber, block.timestamp] as const;
      }),
    );
    const timestamps = new Map(blocks);
    return records.map((r) => ({
      ...r,
      timestamp: timestamps.get(r.blockNumber)!,
    }));
  }

  // -- Private helpers --

  // Single query: T inferred from query return type
  private queryEvents<T extends { blockNumber: bigint }>(
    options: EventRangeProps | undefined,
    query: (s: StepProps) => Promise<T[]>,
  ): Promise<T[]>;

  // Multiple queries: T must be specified explicitly
  private queryEvents<T extends { blockNumber: bigint }>(
    options: EventRangeProps | undefined,
    ...queries: Array<(s: StepProps) => Promise<NoInfer<T>[]>>
  ): Promise<T[]>;

  private async queryEvents<T extends { blockNumber: bigint }>(
    options: EventRangeProps | undefined,
    ...queries: Array<(s: StepProps) => Promise<T[]>>
  ): Promise<T[]> {
    if (this.disabled) return [];

    const stepConfig = await this.parseEventsProps(options);

    const resultSets = await Promise.all(
      queries.map((query) =>
        Promise.all(requestWithBlockStep(stepConfig, query)),
      ),
    );

    return resultSets.flat(2).sort(sortByBlockNumber);
  }

  @Logger('Utils:')
  @ErrorHandler()
  private async parseEventsProps(props?: EventRangeProps) {
    const step = props?.step ?? this.core.maxEventBlocksRange ?? 1_000_000;

    const toBlock = await this.core.core.toBlockNumber({
      block: props?.toBlock ?? 'latest',
    });

    let fromBlock: bigint;
    if (props?.fromBlock) {
      fromBlock = await this.core.core.toBlockNumber({
        block: props.fromBlock ?? 'latest',
      });
    } else if (props?.maxBlocksDepth !== undefined) {
      const depthLimit = toBlock - props.maxBlocksDepth;
      const deploymentBlock = this.core.deploymentBlockNumber ?? 0n;
      fromBlock = depthLimit > deploymentBlock ? depthLimit : deploymentBlock;
    } else {
      fromBlock = this.core.deploymentBlockNumber ?? toBlock - BigInt(step);
    }

    return {
      fromBlock,
      toBlock,
      step,
    };
  }

  private get disabled() {
    return this.core.maxEventBlocksRange === 0;
  }
}
