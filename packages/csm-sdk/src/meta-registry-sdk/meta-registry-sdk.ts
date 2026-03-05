import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { CONTRACT_NAMES, NodeOperatorId } from '../common/index.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import {
  OperatorGroup,
  OperatorMetadata,
  SetOperatorDataProps,
} from './types.js';
import { decodeExternalOperator } from './utils.js';

export class MetaRegistrySDK extends CsmSDKModule<{ tx: TxSDK }> {
  private get contract() {
    return this.core.getContract(CONTRACT_NAMES.metaRegistry);
  }

  @Logger('Call:')
  @ErrorHandler()
  public async setOperatorInfo(props: SetOperatorDataProps) {
    const { nodeOperatorId, name, description, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.contract, 'setOperatorMetadataAsOwner', [
          nodeOperatorId,
          name,
          description,
        ]),
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorInfo(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorMetadata> {
    return this.contract.read.getOperatorMetadata([nodeOperatorId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorGroupId(
    nodeOperatorId: NodeOperatorId,
  ): Promise<bigint> {
    return this.contract.read.getNodeOperatorGroupId([nodeOperatorId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getGroup(groupId: bigint): Promise<OperatorGroup> {
    const group = await this.contract.read.getOperatorGroup([groupId]);

    return {
      ...group,
      externalOperators: group.externalOperators.map(decodeExternalOperator),
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorGroupsCount(): Promise<bigint> {
    return this.contract.read.getOperatorGroupsCount();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorWeight(
    nodeOperatorId: NodeOperatorId,
  ): Promise<bigint> {
    return this.contract.read.getNodeOperatorWeight([nodeOperatorId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorWeights(
    nodeOperatorIds: NodeOperatorId[],
  ): Promise<readonly bigint[]> {
    return this.contract.read.getOperatorWeights([nodeOperatorIds]);
  }
}
