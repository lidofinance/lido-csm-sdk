import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { RolesSDK } from '../roles-sdk/roles-sdk.js';
import { prepCall } from '../tx-sdk/index.js';
import { ChangeAddressesProps, ChangeRoleProps } from './types.js';

export class CuratedRolesSDK extends RolesSDK {
  @Logger('Call:')
  @ErrorHandler()
  public async changeNodeOperatorAddresses(props: ChangeAddressesProps) {
    const { nodeOperatorId, newManagerAddress, newRewardAddress, ...rest } =
      props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.core.contractCuratedModule,
          'changeNodeOperatorAddresses',
          [nodeOperatorId, newManagerAddress, newRewardAddress],
        ),
      decodeResult: () => this.prepareRoleResult(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async changeManagerAddress(props: ChangeRoleProps) {
    const { nodeOperatorId, address, ...rest } = props;

    const { rewardsAddress } =
      await this.bus.operator.getManagementProperties(nodeOperatorId);

    return this.changeNodeOperatorAddresses({
      ...rest,
      nodeOperatorId,
      newManagerAddress: address,
      newRewardAddress: rewardsAddress,
    });
  }
}
