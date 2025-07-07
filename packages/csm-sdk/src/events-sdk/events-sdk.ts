import { Address, GetContractReturnType, Hex, WalletClient } from 'viem';
import { CSFeeOracleAbi } from '../abi/CSFeeOracle.js';
import { CSModuleAbi } from '../abi/CSModule.js';
import { CSModulev1EventsAbi } from '../abi/CSModuleV1Events.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CSM_CONTRACT_NAMES,
  NodeOperator,
  NodeOperatorId,
  NodeOperatorInvite,
} from '../common/index.js';
import { requestWithBlockStep } from '../common/utils/request-with-block-step.js';
import { sortEventsByBlockNumber } from '../common/utils/sort-events.js';
import { reconstructInvites } from './reconstruct-invites.js';
import { reconstructOperators } from './reconstruct-operators.js';
import { EventRangeProps } from './types.js';
import { isDefined, isUnique } from '../common/utils/is-defined.js';

export class EventsSDK extends CsmSDKModule {
  protected get contract(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.core.getContractCSModule();
  }

  protected get contractV1Events(): GetContractReturnType<
    typeof CSModulev1EventsAbi,
    WalletClient
  > {
    return this.core.getContract(
      CSM_CONTRACT_NAMES.csModule,
      CSModulev1EventsAbi,
    );
  }

  private get oracleContract(): GetContractReturnType<
    typeof CSFeeOracleAbi,
    WalletClient
  > {
    return this.core.getContractCSFeeOracle();
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getNodeOperatorsByAddress(
    address: Address,
    options?: EventRangeProps,
  ): Promise<NodeOperator[]> {
    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all([
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorAdded(
          { managerAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorAdded(
          { rewardAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contractV1Events.getEvents.NodeOperatorAdded(
          { managerAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contractV1Events.getEvents.NodeOperatorAdded(
          { rewardAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorManagerAddressChanged(
          { oldAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorManagerAddressChanged(
          { newAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorRewardAddressChanged(
          { oldAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorRewardAddressChanged(
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
    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all([
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorManagerAddressChanged(
          { newAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorRewardAddressChanged(
          { newAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorManagerAddressChangeProposed(
          { oldProposedAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorRewardAddressChangeProposed(
          { oldProposedAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorManagerAddressChangeProposed(
          { newProposedAddress: address },
          stepProps,
        ),
      ),
      ...requestWithBlockStep(stepConfig, (stepProps) =>
        this.contract.getEvents.NodeOperatorRewardAddressChangeProposed(
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
        this.contract.getEvents.WithdrawalSubmitted(
          { nodeOperatorId },
          stepProps,
        ),
      ),
    );

    const logs = logResults.flat().sort(sortEventsByBlockNumber);

    return logs.map((e) => e.args.pubkey).filter((k) => k !== undefined);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getRequestedToExitKeys(
    nodeOperatorId: NodeOperatorId,
    options?: EventRangeProps,
  ): Promise<Hex[]> {
    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all(
      requestWithBlockStep(stepConfig, (stepProps) =>
        this.core
          .getContractValidatorsExitBusOracle()
          .getEvents.ValidatorExitRequest(
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
    const stepConfig = await this.parseEventsProps(options);

    const logResults = await Promise.all(
      requestWithBlockStep(stepConfig, (stepProps) =>
        this.core
          .getContractCSModule()
          .getEvents.ELRewardsStealingPenaltyReported({}, stepProps),
      ),
    );

    const logs = logResults.flat();

    return logs
      .map((e) => e.args.nodeOperatorId)
      .filter(isUnique)
      .filter(isDefined)
      .sort((a, b) => Number(a - b));
  }

  @Logger('Utils:')
  @ErrorHandler()
  private async parseEventsProps(props?: EventRangeProps) {
    const step =
      props?.step ?? this.core.maxEventBlocksRange ?? 1_000_000_000_000;

    const toBlock = await this.core.core.toBlockNumber({
      block: props?.toBlock ?? 'latest',
    });
    const fromBlock = props?.fromBlock
      ? await this.core.core.toBlockNumber({
          block: props.fromBlock ?? 'latest',
        })
      : this.core.deploymentBlockNumber ?? toBlock - BigInt(step);

    return {
      fromBlock,
      toBlock,
      step,
    };
  }
}
