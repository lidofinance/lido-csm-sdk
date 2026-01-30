import { ERROR_CODE, invariant } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';
import { CuratedGateAbi } from '../abi/CuratedGate.js';
import {
  CsmSDKModule,
  CsmSDKProps,
} from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CONTRACT_NAMES,
  CuratedGates,
  Proof,
} from '../common/index.js';
import { findAddressProof } from '../common/utils/find-address-proof.js';
import {
  fetchTree,
  isDefined,
  onError,
  parseCuratedModuleNodeOperatorAddedEvents,
} from '../common/utils/index.js';
import { BindedContract } from '../core-sdk/types.js';
import type { AddressesTreeLeaf, AddressProof } from '../ics-gate-sdk/types.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { ReceiptLike } from '../tx-sdk/types.js';
import { parseCreateOperatorProps } from './parse-create-operator-props.js';
import { CreateNodeOperatorProps, NodeOperatorCreated } from './types.js';

export class CuratedGateSDK extends CsmSDKModule<{
  tx: TxSDK;
}> {
  private gateContract: BindedContract<typeof CuratedGateAbi>;

  constructor(props: CsmSDKProps, gateName: CONTRACT_NAMES, name?: string) {
    super(props, name);

    invariant(
      CuratedGates.includes(gateName),
      `Unsupported gate name: ${gateName}`,
      ERROR_CODE.NOT_SUPPORTED,
    );

    this.gateContract = this.core.getContract(gateName, CuratedGateAbi);
  }

  private async parseOperatorFromReceipt(
    receipt: ReceiptLike,
  ): Promise<NodeOperatorCreated> {
    const nodeOperatorId =
      await parseCuratedModuleNodeOperatorAddedEvents(receipt);
    return { nodeOperatorId };
  }

  // Transaction Method
  @Logger('Call:')
  @ErrorHandler()
  public async createNodeOperator(props: CreateNodeOperatorProps) {
    const { name, description, managerAddress, rewardAddress, proof, ...rest } =
      await parseCreateOperatorProps(props);

    return this.bus.tx.perform<NodeOperatorCreated>({
      ...rest,
      call: () =>
        prepCall(this.gateContract, 'createNodeOperator', [
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
    return this.gateContract.read.curveId();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getTreeConfig() {
    const [root, cid] = await Promise.all([
      this.gateContract.read.treeRoot(),
      this.gateContract.read.treeCid(),
    ]).catch(onError);
    return { root, cid };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async isConsumed(address: Address): Promise<boolean> {
    return this.gateContract.read.isConsumed([address]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async isPaused(): Promise<boolean> {
    return this.gateContract.read.isPaused();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async verifyProof(address: Address, proof: Proof): Promise<boolean> {
    return this.gateContract.read.verifyProof([address, proof]);
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
}
