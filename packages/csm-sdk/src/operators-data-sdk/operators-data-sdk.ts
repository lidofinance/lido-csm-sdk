import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { NodeOperatorId } from '../common/index.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import {
  OperatorData,
  SetOperatorDataByOwnerProps,
  SetOperatorDataProps,
} from './types.js';

export class OperatorsDataSDK extends CsmSDKModule<{ tx: TxSDK }> {
  private get operatorsDataContract() {
    return this.core.contractOperatorsData;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async set(props: SetOperatorDataProps) {
    const { nodeOperatorId, info, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.operatorsDataContract, 'set', [
          BigInt(this.core.moduleId),
          nodeOperatorId,
          info,
        ]),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async setByOwner(props: SetOperatorDataByOwnerProps) {
    const { nodeOperatorId, name, description, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.operatorsDataContract, 'setByOwner', [
          BigInt(this.core.moduleId),
          nodeOperatorId,
          name,
          description,
        ]),
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async get(nodeOperatorId: NodeOperatorId): Promise<OperatorData> {
    return this.operatorsDataContract.read.get([
      BigInt(this.core.moduleId),
      nodeOperatorId,
    ]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async isOwnerEditsRestricted(
    nodeOperatorId: NodeOperatorId,
  ): Promise<boolean> {
    return this.operatorsDataContract.read.isOwnerEditsRestricted([
      BigInt(this.core.moduleId),
      nodeOperatorId,
    ]);
  }

  @Logger('Utils:')
  public async canOwnerEdit(nodeOperatorId: NodeOperatorId): Promise<boolean> {
    const restricted = await this.isOwnerEditsRestricted(nodeOperatorId);
    return !restricted;
  }
}
