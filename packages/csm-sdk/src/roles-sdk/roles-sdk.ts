import { ERROR_CODE, SDKError } from '@lidofinance/lido-ethereum-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { ROLES } from '../common/index.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import {
  ChangeRoleProps,
  ConfirmRoleProps,
  ResetRoleProps,
  WithRole,
} from './types.js';

export class RolesSDK extends CsmSDKModule {
  private declare tx: TxSDK;
  private declare operator: OperatorSDK;

  private get moduleContract() {
    return this.core.contractCSModule;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async changeRewardsRole(props: ChangeRoleProps) {
    const { nodeOperatorId, address, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'changeNodeOperatorRewardAddress', [
          nodeOperatorId,
          address,
        ]),
      decodeResult: () => this.prepareRoleResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async proposeManagerRole(props: ChangeRoleProps) {
    const { nodeOperatorId, address, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.moduleContract,
          'proposeNodeOperatorManagerAddressChange',
          [nodeOperatorId, address],
        ),
      decodeResult: () => this.prepareRoleResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async proposeRewardsRole(props: ChangeRoleProps) {
    const { nodeOperatorId, address, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.moduleContract,
          'proposeNodeOperatorRewardAddressChange',
          [nodeOperatorId, address],
        ),
      decodeResult: () => this.prepareRoleResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async resetManagerRole(props: ResetRoleProps) {
    const { nodeOperatorId, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'resetNodeOperatorManagerAddress', [
          nodeOperatorId,
        ]),
      decodeResult: () => this.prepareRoleResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async confirmRewardsRole(props: ConfirmRoleProps) {
    const { nodeOperatorId, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.moduleContract,
          'confirmNodeOperatorRewardAddressChange',
          [nodeOperatorId],
        ),
      decodeResult: () => this.prepareRoleResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async confirmManagerRole(props: ConfirmRoleProps) {
    const { nodeOperatorId, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.moduleContract,
          'confirmNodeOperatorManagerAddressChange',
          [nodeOperatorId],
        ),
      decodeResult: () => this.prepareRoleResult(nodeOperatorId),
    });
  }

  public async confirmRole(props: WithRole<ConfirmRoleProps>) {
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

  private prepareRoleResult(nodeOperatorId: bigint) {
    return this.operator.getManagementProperties(nodeOperatorId);
  }
}
