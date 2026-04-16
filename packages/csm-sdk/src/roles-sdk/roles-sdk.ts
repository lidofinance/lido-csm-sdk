import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import { CONTRACT_NAMES, ERROR_CODE, ROLES, SDKError } from '../common/index';
import { parseClaimProps } from '../common/utils/parse-claim-props';
import { OperatorSDK } from '../operator-sdk/operator-sdk';
import { prepCall, TxSDK } from '../tx-sdk/index';
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

  @Access({
    level: AccessLevel.MANAGER,
    condition: { extendedManagerPermissions: true },
  })
  @Logger('Call:')
  @ErrorHandler()
  public async changeRewardsAddress(props: ChangeRoleProps) {
    const { nodeOperatorId, address, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'changeNodeOperatorRewardAddress', [
          nodeOperatorId,
          address,
        ]),
      decodeResult: () => this.prepareRoleResult(nodeOperatorId),
    });
  }

  @Access({ level: AccessLevel.MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async proposeManagerAddress(props: ChangeRoleProps) {
    const { nodeOperatorId, address, ...rest } = props;

    return this.bus.tx.perform({
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

  @Access({ level: AccessLevel.REWARDS })
  @Logger('Call:')
  @ErrorHandler()
  public async proposeRewardsAddress(props: ChangeRoleProps) {
    const { nodeOperatorId, address, ...rest } = props;

    return this.bus.tx.perform({
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

  @Access({
    level: AccessLevel.REWARDS,
    condition: { extendedManagerPermissions: false },
  })
  @Logger('Call:')
  @ErrorHandler()
  public async resetManagerAddress(props: ResetRoleProps) {
    const { nodeOperatorId, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'resetNodeOperatorManagerAddress', [
          nodeOperatorId,
        ]),
      decodeResult: () => this.prepareRoleResult(nodeOperatorId),
    });
  }

  @Access({ level: AccessLevel.PROPOSED_REWARDS })
  @Logger('Call:')
  @ErrorHandler()
  public async confirmRewardsAddress(props: ConfirmRoleProps) {
    const { nodeOperatorId, ...rest } = props;

    return this.bus.tx.perform({
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

  @Access({ level: AccessLevel.PROPOSED_MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async confirmManagerAddress(props: ConfirmRoleProps) {
    const { nodeOperatorId, ...rest } = props;

    return this.bus.tx.perform({
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

  public async confirmAddress(props: WithRole<ConfirmRoleProps>) {
    const { role } = props;

    switch (role) {
      case ROLES.MANAGER:
        return this.confirmManagerAddress(props);
      case ROLES.REWARDS:
        return this.confirmRewardsAddress(props);
      default:
        throw new SDKError({
          message: 'unsupported role',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }

  protected prepareRoleResult(nodeOperatorId: bigint) {
    return this.bus.operator.getManagementProperties(nodeOperatorId);
  }

  // Custom Claimer

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async setCustomRewardsClaimer(props: SetCustomClaimerProps) {
    const { nodeOperatorId, claimerAddress, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.accountingContract, 'setCustomRewardsClaimer', [
          nodeOperatorId,
          claimerAddress,
        ]),
    });
  }

  // Fee Splits

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async setFeeSplits(props: SetFeeSplitsProps) {
    const { nodeOperatorId, feeSplits, shares, proof, ...rest } =
      parseClaimProps(props);

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.accountingContract, 'updateFeeSplits', [
          nodeOperatorId,
          feeSplits,
          shares,
          proof,
        ]),
    });
  }
}
