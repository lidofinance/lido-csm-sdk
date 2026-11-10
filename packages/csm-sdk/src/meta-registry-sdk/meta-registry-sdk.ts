import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  Dedupe,
  EstimateView,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import {
  CONTRACT_NAMES,
  ERROR_CODE,
  invariant,
  NodeOperatorId,
} from '../common/index';
import { ModuleSDK } from '../module-sdk/module-sdk';
import { OperatorSDK } from '../operator-sdk/operator-sdk';
import { TxSDK } from '../tx-sdk/index';
import { PerformOptionsNoSpend } from '../tx-sdk/types';
import {
  GroupInfo,
  GroupOperators,
  OperatorGroupStakeSummary,
  OperatorKeysInfo,
  OperatorMetadata,
  OperatorStakeInfo,
  OperatorStakeSummary,
  SetOperatorDataProps,
  SubOperatorStakeSummary,
  TopUpAllocationProps,
} from './types';
import { decodeExternalOperator } from './utils';

const TOP_UP_ALLOCATION_MIN_VERSION = 2n;

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

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorInfo(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorMetadata> {
    return this.contract.read.getOperatorMetadata([nodeOperatorId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getOperatorGroupId(
    nodeOperatorId: NodeOperatorId,
  ): Promise<bigint | null> {
    const groupId = await this.contract.read.getNodeOperatorGroupId([
      nodeOperatorId,
    ]);

    return !groupId ? null : groupId;
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getGroup(groupId: bigint): Promise<GroupOperators | null> {
    if (!groupId) return null;

    const group = await this.contract.read.getOperatorGroup([groupId]);

    return {
      ...group,
      externalOperators: group.externalOperators.map(decodeExternalOperator),
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getOperatorGroup(
    nodeOperatorId: NodeOperatorId,
  ): Promise<GroupInfo | null> {
    const groupId = await this.getOperatorGroupId(nodeOperatorId);
    if (!groupId) return null;

    const group = await this.getGroup(groupId);
    if (!group) return null;

    return {
      groupId,
      ...group,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getOperatorWeight(
    nodeOperatorId: NodeOperatorId,
  ): Promise<bigint> {
    return this.contract.read.getNodeOperatorWeight([nodeOperatorId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getOperatorWeightAndExternalStake(
    nodeOperatorId: NodeOperatorId,
  ) {
    const [weight, externalStake] =
      await this.contract.read.getNodeOperatorWeightAndExternalStake([
        nodeOperatorId,
      ]);
    return { weight, externalStake };
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
  @Dedupe()
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
  @Dedupe()
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

  private async isTopUpAllocationSupported(): Promise<boolean> {
    const version = await this.bus.module.getModuleVersion();
    return version >= TOP_UP_ALLOCATION_MIN_VERSION;
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async isTopUpAllocationEnabled(
    nodeOperatorId: NodeOperatorId,
  ): Promise<boolean> {
    // v1 has no per-operator toggle: top-up allocation is always on
    if (!(await this.isTopUpAllocationSupported())) return true;
    return this.moduleContract.read.isTopUpAllocationEnabled([nodeOperatorId]);
  }

  private buildSetOperatorInfo(
    props: SetOperatorDataProps,
  ): PerformOptionsNoSpend {
    const { nodeOperatorId, name, description, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.contract.encode.setOperatorMetadataAsOwner([
          nodeOperatorId,
          name,
          description,
        ]),
    };
  }

  private async buildEnableTopUpAllocation(
    props: TopUpAllocationProps,
  ): Promise<PerformOptionsNoSpend> {
    const { nodeOperatorId, ...rest } = props;
    await this.assertTopUpAllocationSupported();

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.enableTopUpAllocation([nodeOperatorId]),
    };
  }

  private async buildDisableTopUpAllocation(
    props: TopUpAllocationProps,
  ): Promise<PerformOptionsNoSpend> {
    const { nodeOperatorId, ...rest } = props;
    await this.assertTopUpAllocationSupported();

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.disableTopUpAllocation([nodeOperatorId]),
    };
  }

  private async assertTopUpAllocationSupported() {
    invariant(
      await this.isTopUpAllocationSupported(),
      'Top-up allocation toggle requires CuratedModule v2',
      ERROR_CODE.NOT_SUPPORTED,
    );
  }

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async setOperatorInfo(props: SetOperatorDataProps) {
    return this.bus.tx.perform(this.buildSetOperatorInfo(props));
  }

  @EstimateView()
  public async estimateSetOperatorInfo(props: SetOperatorDataProps) {
    return this.bus.tx.estimate(this.buildSetOperatorInfo(props));
  }

  @Access({
    level: AccessLevel.PROTOCOL_ROLE,
    protocolRole: 'ENABLE_TOP_UP_ALLOCATION_ROLE',
  })
  @Logger('Call:')
  @ErrorHandler()
  public async enableTopUpAllocation(props: TopUpAllocationProps) {
    return this.bus.tx.perform(await this.buildEnableTopUpAllocation(props));
  }

  @EstimateView()
  public async estimateEnableTopUpAllocation(props: TopUpAllocationProps) {
    return this.bus.tx.estimate(await this.buildEnableTopUpAllocation(props));
  }

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async disableTopUpAllocation(props: TopUpAllocationProps) {
    return this.bus.tx.perform(await this.buildDisableTopUpAllocation(props));
  }

  @EstimateView()
  public async estimateDisableTopUpAllocation(props: TopUpAllocationProps) {
    return this.bus.tx.estimate(await this.buildDisableTopUpAllocation(props));
  }

  @Logger('Utils:')
  public async getOperatorStakeSummary(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorStakeSummary> {
    const [{ weight, externalStake }, { currentStake, targetStake }] =
      await Promise.all([
        this.getOperatorWeightAndExternalStake(nodeOperatorId),
        this.getOperatorTargetStake(nodeOperatorId),
      ]);

    return {
      weight,
      currentStake,
      targetStake,
      externalStake,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getGroupStakeSummary(
    groupId: bigint,
  ): Promise<SubOperatorStakeSummary[] | null> {
    const group = await this.getGroup(groupId);
    if (!group) return null;

    const summaries = await Promise.all(
      group.subNodeOperators.map((op) =>
        this.getOperatorStakeSummary(op.nodeOperatorId),
      ),
    );

    return group.subNodeOperators.map((op, i) => ({
      nodeOperatorId: op.nodeOperatorId,
      share: op.share,
      ...summaries[i]!,
    }));
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorGroupStakeSummary(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorGroupStakeSummary | null> {
    const group = await this.getOperatorGroup(nodeOperatorId);
    if (!group) return null;

    const operators = await this.getGroupStakeSummary(group.groupId);
    if (!operators) return null;

    return {
      ...group,
      operators,
    };
  }
}
