import {
  ERROR_CODE,
  SDKError,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { NodeOperatorShortInfo, ROLES } from '../common/index.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import {
  ChangeRoleProps,
  ConfirmRoleProps,
  ResetRoleProps,
  WithRole,
} from './types.js';

export class RolesSDK extends CsmSDKModule<{
  operator: OperatorSDK;
}> {
  private get moduleContract() {
    return this.core.contractCSModule;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async changeRewardsRole(
    props: ChangeRoleProps,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const { nodeOperatorId, address, ...rest } = props;

    const args = [nodeOperatorId, address] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.moduleContract.estimateGas.changeNodeOperatorRewardAddress(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.moduleContract.write.changeNodeOperatorRewardAddress(args, {
          ...options,
        }),
      decodeResult: () => this.prepareResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async proposeManagerRole(
    props: ChangeRoleProps,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const { nodeOperatorId, address, ...rest } = props;

    const args = [nodeOperatorId, address] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.moduleContract.estimateGas.proposeNodeOperatorManagerAddressChange(
          args,
          {
            ...options,
          },
        ),
      sendTransaction: (options) =>
        this.moduleContract.write.proposeNodeOperatorManagerAddressChange(
          args,
          {
            ...options,
          },
        ),
      decodeResult: () => this.prepareResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async proposeRewardsRole(
    props: ChangeRoleProps,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const { nodeOperatorId, address, ...rest } = props;

    const args = [nodeOperatorId, address] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.moduleContract.estimateGas.proposeNodeOperatorRewardAddressChange(
          args,
          {
            ...options,
          },
        ),
      sendTransaction: (options) =>
        this.moduleContract.write.proposeNodeOperatorRewardAddressChange(args, {
          ...options,
        }),
      decodeResult: () => this.prepareResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async resetManagerRole(
    props: ResetRoleProps,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const { nodeOperatorId, ...rest } = props;

    const args = [nodeOperatorId] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.moduleContract.estimateGas.resetNodeOperatorManagerAddress(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.moduleContract.write.resetNodeOperatorManagerAddress(args, {
          ...options,
        }),
      decodeResult: () => this.prepareResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async confirmRewardsRole(
    props: ConfirmRoleProps,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const { nodeOperatorId, ...rest } = props;

    const args = [nodeOperatorId] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.moduleContract.estimateGas.confirmNodeOperatorRewardAddressChange(
          args,
          {
            ...options,
          },
        ),
      sendTransaction: (options) =>
        this.moduleContract.write.confirmNodeOperatorRewardAddressChange(args, {
          ...options,
        }),
      decodeResult: () => this.prepareResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async confirmManagerRole(
    props: ConfirmRoleProps,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const { nodeOperatorId, ...rest } = props;

    const args = [nodeOperatorId] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.moduleContract.estimateGas.confirmNodeOperatorManagerAddressChange(
          args,
          {
            ...options,
          },
        ),
      sendTransaction: (options) =>
        this.moduleContract.write.confirmNodeOperatorManagerAddressChange(
          args,
          {
            ...options,
          },
        ),
      decodeResult: () => this.prepareResult(nodeOperatorId),
    });
  }

  public async confirmRole(
    props: WithRole<ConfirmRoleProps>,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const { role } = props;

    switch (role) {
      case ROLES.MANAGER:
        return this.confirmManagerRole(props);
      case ROLES.REWARDS:
        return this.confirmRewardsRole(props);
      default:
        throw new SDKError({
          message: 'unsupported role',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }

  private prepareResult(nodeOperatorId: bigint) {
    return this.bus
      .getOrThrow('operator')
      .getManagementProperties(nodeOperatorId);
  }
}
