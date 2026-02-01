import { Address } from 'viem';
import { CuratedGateAbi } from '../abi/CuratedGate.js';
import {
  CsmSDKModule,
  CsmSDKProps,
} from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CURATED_GATES,
  NodeOperatorShortInfo,
  Proof,
} from '../common/index.js';
import { findAddressProof } from '../common/utils/find-address-proof.js';
import {
  fetchTree,
  isDefined,
  onError,
  parseNodeOperatorAddedEvents,
} from '../common/utils/index.js';
import { BindedContract } from '../core-sdk/types.js';
import type { AddressesTreeLeaf, AddressProof } from '../ics-gate-sdk/types.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { ReceiptLike } from '../tx-sdk/types.js';
import { parseCreateOperatorProps } from './parse-create-operator-props.js';
import { CreateNodeOperatorProps, GateEligibility } from './types.js';

export class CuratedGateSDK extends CsmSDKModule<{
  tx: TxSDK;
  operator: OperatorSDK;
}> {
  private contract: BindedContract<typeof CuratedGateAbi>;

  constructor(props: CsmSDKProps, gateName: CURATED_GATES, name?: string) {
    super(props, name);

    this.contract = this.core.getContract(gateName);
  }

  private async parseOperatorFromReceipt(receipt: ReceiptLike) {
    const nodeOperatorId = await parseNodeOperatorAddedEvents(receipt);
    return this.bus.operator.getManagementProperties(nodeOperatorId);
  }

  // Transaction Method
  @Logger('Call:')
  @ErrorHandler()
  public async createNodeOperator(props: CreateNodeOperatorProps) {
    const { name, description, managerAddress, rewardAddress, proof, ...rest } =
      await parseCreateOperatorProps(props);

    return this.bus.tx.perform<NodeOperatorShortInfo>({
      ...rest,
      call: () =>
        prepCall(this.contract, 'createNodeOperator', [
          name,
          description,
          managerAddress,
          rewardAddress,
          proof,
        ]),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    });
  }

  // View Methods
  @Logger('Views:')
  @ErrorHandler()
  public async getCurveId(): Promise<bigint> {
    return this.contract.read.curveId();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getTreeConfig() {
    const [root, cid] = await Promise.all([
      this.contract.read.treeRoot(),
      this.contract.read.treeCid(),
    ]).catch(onError);
    return { root, cid };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async isConsumed(address: Address): Promise<boolean> {
    return this.contract.read.isConsumed([address]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async isPaused(): Promise<boolean> {
    return this.contract.read.isPaused();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async verifyProof(address: Address, proof: Proof): Promise<boolean> {
    return this.contract.read.verifyProof([address, proof]);
  }

  // Tree & Proof Utilities
  @Logger('Utils:')
  public getProofTreeUrls(cid: string): string[] {
    return [
      ...this.core.getIpfsUrls(cid),
      this.core.curatedGateTreeLink,
    ].filter(isDefined);
  }

  @Logger('API:')
  @Cache(CACHE_LONG)
  public async getProofTree() {
    const { root, cid } = await this.getTreeConfig();
    if (!root || !cid) return null;

    const urls = this.getProofTreeUrls(cid);
    return fetchTree<AddressesTreeLeaf>({ urls, root });
  }

  @Logger('Utils:')
  public async getProof(address: Address): Promise<Proof | null> {
    const proofTree = await this.getProofTree();
    if (!proofTree) return null;
    return findAddressProof(proofTree, address);
  }

  @Logger('Utils:')
  public async getProofAndConsumed(address: Address): Promise<AddressProof> {
    const [proof, isConsumed] = await Promise.all([
      this.getProof(address),
      this.isConsumed(address),
    ]);
    return { proof, isConsumed };
  }

  @Logger('Views:')
  public async getEligibility(address: Address): Promise<GateEligibility> {
    const [curveId, isPaused, proof, isConsumed] = await Promise.all([
      this.getCurveId(),
      this.isPaused(),
      this.getProof(address),
      this.isConsumed(address),
    ]);

    const isEligible = !!proof && !isConsumed && !isPaused;

    return {
      isPaused,
      curveId,
      proof,
      isConsumed,
      isEligible,
    };
  }
}
