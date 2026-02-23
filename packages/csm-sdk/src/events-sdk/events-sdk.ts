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
  sortEventsByBlockNumber,
} from '../common/utils/index.js';
import { BindedContract } from '../core-sdk/types.js';
import { reconstructInvites } from './reconstruct-invites.js';
import { reconstructOperators } from './reconstruct-operators.js';
import {
  EventRangeProps,
  OperatorCurveIdChange,
  PenaltyRecord,
} from './types.js';

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
    if (this.disabled) return [];

    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all([
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorAdded(
          { managerAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorAdded(
          { rewardAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContractV1.getEvents.NodeOperatorAdded(
          { managerAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContractV1.getEvents.NodeOperatorAdded(
          { rewardAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChanged(
          { oldAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChanged(
          { newAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChanged(
          { oldAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChanged(
          { newAddress: address },
          stepProps,
        ),
      ),
    ]);

    const logs = logResults.flat().sort(sortEventsByBlockNumber);

    return reconstructOperators(logs, address);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getInvitesByAddress(
    address: Address,
    options?: EventRangeProps,
  ): Promise<NodeOperatorInvite[]> {
    if (this.disabled) return [];

    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all([
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChanged(
          { newAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChanged(
          { newAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChangeProposed(
          { oldProposedAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChangeProposed(
          { oldProposedAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorManagerAddressChangeProposed(
          { newProposedAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.NodeOperatorRewardAddressChangeProposed(
          { newProposedAddress: address },
          stepProps,
        ),
      ),
    ]);

    const logs = logResults.flat().sort(sortEventsByBlockNumber);

    return reconstructInvites(logs, address);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getRewardsReports(options?: EventRangeProps) {
    if (this.disabled) return [];

    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all(
      requestWithBlockStep(stepConfig, (stepProps) =>
        this.oracleContract.getEvents.ProcessingStarted(undefined, stepProps),
      ),
    );

    const logs = logResults.flat().sort(sortEventsByBlockNumber);

    return logs;
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getWithdrawalSubmittedKeys(
    nodeOperatorId: NodeOperatorId,
    options?: EventRangeProps,
  ): Promise<Hex[]> {
    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all(
      requestWithBlockStep(stepConfig, (stepProps) =>
        this.moduleContract.getEvents.ValidatorWithdrawn(
          { nodeOperatorId },
          stepProps,
        ),
      ),
    );

    const logs = logResults.flat().sort(sortEventsByBlockNumber);

    return logs.map((e) => e.args.pubkey).filter(isDefined);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getRequestedToExitKeys(
    nodeOperatorId: NodeOperatorId,
    options?: EventRangeProps,
  ): Promise<Hex[]> {
    if (this.disabled) return [];

    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all(
      requestWithBlockStep(stepConfig, (stepProps) =>
        this.core.contractValidatorsExitBusOracle.getEvents.ValidatorExitRequest(
          { nodeOperatorId, stakingModuleId: BigInt(this.core.moduleId) },
          stepProps,
        ),
      ),
    );

    const logs = logResults.flat().sort(sortEventsByBlockNumber);

    return logs.map((e) => e.args.validatorPubkey).filter(isDefined);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getOperatorsWithPenalties(
    options?: EventRangeProps,
  ): Promise<NodeOperatorId[]> {
    if (this.disabled) return [];

    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all(
      requestWithBlockStep(stepConfig, (stepProps) =>
        this.accountingContract.getEvents.BondLockChanged({}, stepProps),
      ),
    );

    const logs = logResults.flat();

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
    if (this.disabled) return [];

    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all(
      requestWithBlockStep(stepConfig, (stepProps) =>
        this.accountingContract.getEvents.BondCurveSet(
          { nodeOperatorId },
          stepProps,
        ),
      ),
    );

    return logResults
      .flat()
      .map(({ args: { curveId }, blockNumber }) => ({ curveId, blockNumber }))
      .filter(isPropsDefined('curveId'))
      .sort(sortEventsByBlockNumber);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getPenalties(
    nodeOperatorId: NodeOperatorId,
    options?: EventRangeProps,
  ): Promise<PenaltyRecord[]> {
    if (this.disabled) return [];

    const stepConfig = await this.parseEventsProps(options);

    const [
      reported,
      reportedV1,
      cancelled,
      cancelledV1,
      compensated,
      compensatedV1,
      settled,
      settledV1,
    ] = await Promise.all([
      // V2: GeneralDelayedPenalty* from contractBaseModule
      Promise.all(
        requestWithBlockStep(stepConfig, (stepProps) =>
          this.moduleContract.getEvents.GeneralDelayedPenaltyReported(
            { nodeOperatorId },
            stepProps,
          ),
        ),
      ),
      // V1: ELRewardsStealingPenalty* from moduleContractV1
      Promise.all(
        requestWithBlockStep(stepConfig, (stepProps) =>
          this.moduleContractV1.getEvents.ELRewardsStealingPenaltyReported(
            { nodeOperatorId },
            stepProps,
          ),
        ),
      ),
      Promise.all(
        requestWithBlockStep(stepConfig, (stepProps) =>
          this.moduleContract.getEvents.GeneralDelayedPenaltyCancelled(
            { nodeOperatorId },
            stepProps,
          ),
        ),
      ),
      Promise.all(
        requestWithBlockStep(stepConfig, (stepProps) =>
          this.moduleContractV1.getEvents.ELRewardsStealingPenaltyCancelled(
            { nodeOperatorId },
            stepProps,
          ),
        ),
      ),
      Promise.all(
        requestWithBlockStep(stepConfig, (stepProps) =>
          this.moduleContract.getEvents.GeneralDelayedPenaltyCompensated(
            { nodeOperatorId },
            stepProps,
          ),
        ),
      ),
      Promise.all(
        requestWithBlockStep(stepConfig, (stepProps) =>
          this.moduleContractV1.getEvents.ELRewardsStealingPenaltyCompensated(
            { nodeOperatorId },
            stepProps,
          ),
        ),
      ),
      Promise.all(
        requestWithBlockStep(stepConfig, (stepProps) =>
          this.moduleContract.getEvents.GeneralDelayedPenaltySettled(
            { nodeOperatorId },
            stepProps,
          ),
        ),
      ),
      Promise.all(
        requestWithBlockStep(stepConfig, (stepProps) =>
          this.moduleContractV1.getEvents.ELRewardsStealingPenaltySettled(
            { nodeOperatorId },
            stepProps,
          ),
        ),
      ),
    ]);

    const records: PenaltyRecord[] = [
      ...reported.flat().map(
        ({ args, blockNumber, transactionHash }): PenaltyRecord => ({
          type: 'reported',
          nodeOperatorId: args.nodeOperatorId!,
          amount: args.amount!,
          penaltyType: args.penaltyType!,
          additionalFine: args.additionalFine!,
          details: args.details!,
          blockNumber: blockNumber!,
          transactionHash: transactionHash!,
        }),
      ),
      ...reportedV1.flat().map(
        ({ args, blockNumber, transactionHash }): PenaltyRecord => ({
          type: 'reported',
          nodeOperatorId: args.nodeOperatorId!,
          amount: args.stolenAmount!,
          blockNumber: blockNumber!,
          transactionHash: transactionHash!,
        }),
      ),
      ...[...cancelled.flat(), ...cancelledV1.flat()].map(
        ({ args, blockNumber, transactionHash }): PenaltyRecord => ({
          type: 'cancelled',
          nodeOperatorId: args.nodeOperatorId!,
          amount: args.amount!,
          blockNumber: blockNumber!,
          transactionHash: transactionHash!,
        }),
      ),
      ...[...compensated.flat(), ...compensatedV1.flat()].map(
        ({ args, blockNumber, transactionHash }): PenaltyRecord => ({
          type: 'compensated',
          nodeOperatorId: args.nodeOperatorId!,
          amount: args.amount!,
          blockNumber: blockNumber!,
          transactionHash: transactionHash!,
        }),
      ),
      ...[...settled.flat(), ...settledV1.flat()].map(
        ({ args, blockNumber, transactionHash }): PenaltyRecord => ({
          type: 'settled',
          nodeOperatorId: args.nodeOperatorId!,
          blockNumber: blockNumber!,
          transactionHash: transactionHash!,
        }),
      ),
    ];

    return records.sort(sortEventsByBlockNumber);
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
