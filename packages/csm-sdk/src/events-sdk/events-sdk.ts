/* eslint-disable sonarjs/no-identical-functions */
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
import { EventRangeProps, OperatorCurveIdChange } from './types.js';

export class EventsSDK extends CsmSDKModule {
  private get moduleContract() {
    return this.core.contractBaseModule;
  }

  private get moduleContractV1(): BindedContract<typeof CSModulev1EventsAbi> {
    return this.core.getContract(CONTRACT_NAMES.csModule, CSModulev1EventsAbi);
  }

  private get oracleContract() {
    return this.core.contractFeeOracle;
  }

  private get distributorContract() {
    return this.core.contractFeeDistributor;
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
  public async getDistributionLogUpdated(options?: EventRangeProps) {
    if (this.disabled) return [];

    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all(
      requestWithBlockStep(stepConfig, (stepProps) =>
        this.distributorContract.getEvents.DistributionLogUpdated(stepProps),
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
