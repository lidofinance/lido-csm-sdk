import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CACHE_MID, CONTRACT_NAMES, NodeOperatorId } from '../common/index.js';
import { ModuleSDK } from '../module-sdk/module-sdk.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import {
  OperatorGroup,
  OperatorKeysInfo,
  OperatorMetadata,
  OperatorStakeInfo,
  OperatorStakeSummary,
  SetOperatorDataProps,
  SubOperatorStakeSummary,
} from './types.js';
import { decodeExternalOperator } from './utils.js';

export class MetaRegistrySDK extends CsmSDKModule<{
  tx: TxSDK;
  module: ModuleSDK;
  operator: OperatorSDK;
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
  @Cache(CACHE_MID)
  private async getDepositAllocations() {
    return this.moduleContract.read.getDepositAllocationTargets();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorTargetKeys(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorKeysInfo> {
    const [current, target] = await this.getDepositAllocations();

    const idx = Number(nodeOperatorId);

    return {
      targetKeys: Number(target[idx] ?? 0n),
      currentKeys: Number(current[idx] ?? 0n),
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  private async getTopUpAllocations() {
    return this.moduleContract.read.getTopUpAllocationTargets();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorTargetStake(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorStakeInfo> {
    const [current, target] = await this.getTopUpAllocations();

    const idx = Number(nodeOperatorId);

    return {
      targetStake: target[idx] ?? 0n,
      currentStake: current[idx] ?? 0n,
    };
  }

  @Logger('Utils:')
  public async getOperatorStakeSummary(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorStakeSummary> {
    const [weight, { currentStake, targetStake }, info] = await Promise.all([
      this.getOperatorWeight(nodeOperatorId),
      this.getOperatorTargetStake(nodeOperatorId),
      this.bus.operator.getInfo(nodeOperatorId),
    ]);

    return {
      weight,
      currentStake,
      targetStake,
      activeKeys: info.totalDepositedKeys - info.totalWithdrawnKeys,
      depositableKeys: info.totalAddedKeys - info.totalDepositedKeys,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getGroupStakeSummary(
    nodeOperatorId: NodeOperatorId,
  ): Promise<SubOperatorStakeSummary[]> {
    const group = await this.getOperatorGroup(nodeOperatorId);
    const ids = group.subNodeOperators.map((op) => op.nodeOperatorId);

    const [weights, [currentStakes, targetStakes], infos] = await Promise.all([
      this.contract.read.getOperatorWeights([ids]),
      this.getTopUpAllocations(),
      Promise.all(ids.map((id) => this.bus.operator.getInfo(id))),
    ]);

    return group.subNodeOperators.map((op, i) => ({
      nodeOperatorId: op.nodeOperatorId,
      share: op.share,
      weight: weights[i] ?? 0n,
      currentStake: currentStakes[Number(op.nodeOperatorId)] ?? 0n,
      targetStake: targetStakes[Number(op.nodeOperatorId)] ?? 0n,
      activeKeys: infos[i]!.totalDepositedKeys - infos[i]!.totalWithdrawnKeys,
      depositableKeys: infos[i]!.totalAddedKeys - infos[i]!.totalDepositedKeys,
    }));
  }
}
