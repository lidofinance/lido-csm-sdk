import { Address, GetContractReturnType, WalletClient } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { CSModulev1EventsAbi } from '../abi/CSModuleV1Events.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CSM_CONTRACT_NAMES,
  DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN,
  NodeOperator,
  NodeOperatorInvite,
} from '../common/index.js';
import { requestWithBlockStep } from '../common/utils/request-with-block-step.js';
import { reconstructInvites } from './reconstruct-invites.js';
import { reconstructOperators } from './reconstruct-operators.js';
import { EventRangeProps } from './types.js';
import { CSFeeOracleAbi } from '../abi/CSFeeOracle.js';
import { sortEventsByBlockNumber } from '../common/utils/sort-events.js';

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

  @Logger('Utils:')
  @ErrorHandler()
  public async parseEventsProps(props?: EventRangeProps) {
    // FIXME: const 20K and param
    const step = props?.step ?? 1_000_000;

    const toBlock = await this.core.core.toBlockNumber({
      block: props?.toBlock ?? 'latest',
    });
    const fromBlock = props?.fromBlock
      ? await this.core.core.toBlockNumber({
          block: props.fromBlock ?? 'latest',
        })
      : DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN[this.core.chainId] ??
        toBlock - BigInt(step);

    return {
      fromBlock,
      toBlock,
      step,
    };
  }
}
