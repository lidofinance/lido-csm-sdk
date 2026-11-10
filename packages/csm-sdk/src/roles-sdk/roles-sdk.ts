import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  EstimateView,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import {
  CONTRACT_NAMES,
  ERROR_CODE,
  NodeOperatorShortInfo,
  ROLES,
  SDKError,
} from '../common/index';
import { parseClaimProps } from '../common/utils/parse-claim-props';
import { OperatorSDK } from '../operator-sdk/operator-sdk';
import { TxSDK } from '../tx-sdk/index';
import { PerformOptions, PerformOptionsNoSpend } from '../tx-sdk/types';
import {
  ChangeRoleProps,
  ConfirmRoleProps,
  ResetRoleProps,
  SetCustomClaimerProps,
  SetFeeSplitsProps,
  WithRole,
} from './types';

export class RolesSDK extends CsmSDKModule<{
  tx: TxSDK;
  operator: OperatorSDK;
}> {
  private get moduleContract() {
    return this.core.contractBaseModule;
  }

  private get accountingContract() {
    return this.core.getContract(CONTRACT_NAMES.accounting);
  }

  private buildChangeRewardsAddress(
    props: ChangeRoleProps,
  ): PerformOptionsNoSpend<NodeOperatorShortInfo> {
    const { nodeOperatorId, address, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.changeNodeOperatorRewardAddress([
          nodeOperatorId,
          address,
        ]),
      decodeResult: () => this.prepareNodeOperatorShortInfo(nodeOperatorId),
    };
  }

  @Access({
    level: AccessLevel.MANAGER,
    condition: { extendedManagerPermissions: true },
  })
  @Logger('Call:')
  @ErrorHandler()
  public async changeRewardsAddress(props: ChangeRoleProps) {
    return this.bus.tx.perform(this.buildChangeRewardsAddress(props));
  }

  @EstimateView()
  public async estimateChangeRewardsAddress(props: ChangeRoleProps) {
    return this.bus.tx.estimate(this.buildChangeRewardsAddress(props));
  }

  private buildProposeManagerAddress(
    props: ChangeRoleProps,
  ): PerformOptionsNoSpend<NodeOperatorShortInfo> {
    const { nodeOperatorId, address, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.proposeNodeOperatorManagerAddressChange([
          nodeOperatorId,
          address,
        ]),
      decodeResult: () => this.prepareNodeOperatorShortInfo(nodeOperatorId),
    };
  }

  @Access({ level: AccessLevel.MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async proposeManagerAddress(props: ChangeRoleProps) {
    return this.bus.tx.perform(this.buildProposeManagerAddress(props));
  }

  @EstimateView()
  public async estimateProposeManagerAddress(props: ChangeRoleProps) {
    return this.bus.tx.estimate(this.buildProposeManagerAddress(props));
  }

  private buildProposeRewardsAddress(
    props: ChangeRoleProps,
  ): PerformOptionsNoSpend<NodeOperatorShortInfo> {
    const { nodeOperatorId, address, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.proposeNodeOperatorRewardAddressChange([
          nodeOperatorId,
          address,
        ]),
      decodeResult: () => this.prepareNodeOperatorShortInfo(nodeOperatorId),
    };
  }

  @Access({ level: AccessLevel.REWARDS })
  @Logger('Call:')
  @ErrorHandler()
  public async proposeRewardsAddress(props: ChangeRoleProps) {
    return this.bus.tx.perform(this.buildProposeRewardsAddress(props));
  }

  @EstimateView()
  public async estimateProposeRewardsAddress(props: ChangeRoleProps) {
    return this.bus.tx.estimate(this.buildProposeRewardsAddress(props));
  }

  private buildResetManagerAddress(
    props: ResetRoleProps,
  ): PerformOptionsNoSpend<NodeOperatorShortInfo> {
    const { nodeOperatorId, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.resetNodeOperatorManagerAddress([
          nodeOperatorId,
        ]),
      decodeResult: () => this.prepareNodeOperatorShortInfo(nodeOperatorId),
    };
  }

  @Access({
    level: AccessLevel.REWARDS,
    condition: { extendedManagerPermissions: false },
  })
  @Logger('Call:')
  @ErrorHandler()
  public async resetManagerAddress(props: ResetRoleProps) {
    return this.bus.tx.perform(this.buildResetManagerAddress(props));
  }

  @EstimateView()
  public async estimateResetManagerAddress(props: ResetRoleProps) {
    return this.bus.tx.estimate(this.buildResetManagerAddress(props));
  }

  private buildConfirmRewardsAddress(
    props: ConfirmRoleProps,
  ): PerformOptionsNoSpend<NodeOperatorShortInfo> {
    const { nodeOperatorId, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.confirmNodeOperatorRewardAddressChange([
          nodeOperatorId,
        ]),
      decodeResult: () => this.prepareNodeOperatorShortInfo(nodeOperatorId),
    };
  }

  @Access({ level: AccessLevel.PROPOSED_REWARDS })
  @Logger('Call:')
  @ErrorHandler()
  public async confirmRewardsAddress(props: ConfirmRoleProps) {
    return this.bus.tx.perform(this.buildConfirmRewardsAddress(props));
  }

  @EstimateView()
  public async estimateConfirmRewardsAddress(props: ConfirmRoleProps) {
    return this.bus.tx.estimate(this.buildConfirmRewardsAddress(props));
  }

  private buildConfirmManagerAddress(
    props: ConfirmRoleProps,
  ): PerformOptionsNoSpend<NodeOperatorShortInfo> {
    const { nodeOperatorId, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.confirmNodeOperatorManagerAddressChange([
          nodeOperatorId,
        ]),
      decodeResult: () => this.prepareNodeOperatorShortInfo(nodeOperatorId),
    };
  }

  @Access({ level: AccessLevel.PROPOSED_MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async confirmManagerAddress(props: ConfirmRoleProps) {
    return this.bus.tx.perform(this.buildConfirmManagerAddress(props));
  }

  @EstimateView()
  public async estimateConfirmManagerAddress(props: ConfirmRoleProps) {
    return this.bus.tx.estimate(this.buildConfirmManagerAddress(props));
  }

  private buildConfirmAddress(
    props: WithRole<ConfirmRoleProps>,
  ): PerformOptions<NodeOperatorShortInfo> {
    switch (props.role) {
      case ROLES.MANAGER:
        return this.buildConfirmManagerAddress(props);
      case ROLES.REWARDS:
        return this.buildConfirmRewardsAddress(props);
      default:
        throw new SDKError({
          message: 'unsupported role',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }

  @Logger('Call:')
  @ErrorHandler()
  public async confirmAddress(props: WithRole<ConfirmRoleProps>) {
    return this.bus.tx.perform(this.buildConfirmAddress(props));
  }

  @EstimateView()
  public async estimateConfirmAddress(props: WithRole<ConfirmRoleProps>) {
    return this.bus.tx.estimate(this.buildConfirmAddress(props));
  }

  protected prepareNodeOperatorShortInfo(nodeOperatorId: bigint) {
    return this.bus.operator.getManagementProperties(nodeOperatorId);
  }

  // Custom Claimer

  private buildSetCustomRewardsClaimer(
    props: SetCustomClaimerProps,
  ): PerformOptionsNoSpend {
    const { nodeOperatorId, claimerAddress, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.accountingContract.encode.setCustomRewardsClaimer([
          nodeOperatorId,
          claimerAddress,
        ]),
    };
  }

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async setCustomRewardsClaimer(props: SetCustomClaimerProps) {
    return this.bus.tx.perform(this.buildSetCustomRewardsClaimer(props));
  }

  @EstimateView()
  public async estimateSetCustomRewardsClaimer(props: SetCustomClaimerProps) {
    return this.bus.tx.estimate(this.buildSetCustomRewardsClaimer(props));
  }

  // Fee Splits

  private buildSetFeeSplits(props: SetFeeSplitsProps): PerformOptionsNoSpend {
    const { nodeOperatorId, feeSplits, shares, proof, ...rest } =
      parseClaimProps(props);

    return {
      ...rest,
      call: () =>
        this.accountingContract.encode.updateFeeSplits([
          nodeOperatorId,
          feeSplits,
          shares,
          proof,
        ]),
    };
  }

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async setFeeSplits(props: SetFeeSplitsProps) {
    return this.bus.tx.perform(this.buildSetFeeSplits(props));
  }

  @EstimateView()
  public async estimateSetFeeSplits(props: SetFeeSplitsProps) {
    return this.bus.tx.estimate(this.buildSetFeeSplits(props));
  }
}
