import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CACHE_MID, CONTRACT_NAMES, NodeOperatorId } from '../common/index.js';
import { ModuleSDK } from '../module-sdk/module-sdk.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import {
  OperatorGroup,
  OperatorMetadata,
  SetOperatorDataProps,
} from './types.js';
import { decodeExternalOperator } from './utils.js';

export class MetaRegistrySDK extends CsmSDKModule<{
  tx: TxSDK;
  module: ModuleSDK;
}> {
  private get contract() {
    return this.core.getContract(CONTRACT_NAMES.metaRegistry);
  }

  private get moduleContract() {
    return this.core.getContract(CONTRACT_NAMES.curatedModule);
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
  public async getOperatorGroup(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorGroup> {
    const groupId = await this.contract.read.getNodeOperatorGroupId([
      nodeOperatorId,
    ]);
    const group = await this.contract.read.getOperatorGroup([groupId]);

    return {
      ...group,
      externalOperators: group.externalOperators.map(decodeExternalOperator),
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getOperatorWeight(
    nodeOperatorId: NodeOperatorId,
  ): Promise<bigint> {
    return this.contract.read.getNodeOperatorWeight([nodeOperatorId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorBalance(
    nodeOperatorId: NodeOperatorId,
  ): Promise<bigint> {
    return this.moduleContract.read.getNodeOperatorBalance([nodeOperatorId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorTargetStake(
    nodeOperatorId: NodeOperatorId,
  ): Promise<bigint> {
    const [totalStake, totalWeight, operatorWeight] = await Promise.all([
      this.bus.module.getBalance(),
      this.getTotalOperatorsWeight(),
      this.getOperatorWeight(nodeOperatorId),
    ]);

    if (totalWeight === 0n) return 0n;
    return (totalStake * operatorWeight) / totalWeight;
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  private async getTotalOperatorsWeight(): Promise<bigint> {
    const count = await this.bus.module.getOperatorsCount();
    const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i));
    const weights = await this.contract.read.getOperatorWeights([ids]);
    return weights.reduce((sum, w) => sum + w, 0n);
  }
}
