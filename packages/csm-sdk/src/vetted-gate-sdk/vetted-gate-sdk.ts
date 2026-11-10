import { Address, Hex } from 'viem';
import { VettedGateAbi } from '../abi/VettedGate';
import {
  CsmSDKModule,
  CsmSDKProps,
} from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  Cache,
  EstimateView,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import {
  CACHE_IMMUTABLE,
  ERROR_CODE,
  GateEligibility,
  NodeOperatorShortInfo,
  Proof,
  SDKError,
  TOKENS,
  WithToken,
} from '../common/index';
import {
  AddressProof,
  AddressTreeLeaf,
  fetchTree,
  findAddressProof,
  isDefined,
  onError,
  parseAddOperatorProps,
  parseNodeOperatorAddedEvents,
} from '../common/utils/index';
import { BindedContract } from '../core-sdk/types';
import { KeysCacheSDK, withKeysCacheCallback } from '../keys-cache-sdk/index';
import { OperatorSDK } from '../operator-sdk/operator-sdk';
import { TxSDK } from '../tx-sdk/index';
import {
  PerformOptions,
  PerformOptionsNoSpend,
  PerformOptionsSpend,
  ReceiptLike,
} from '../tx-sdk/types';
import {
  AddVettedNodeOperatorProps,
  ClaimCurveProps,
  VettedGateContractName,
} from './types';

export class VettedGateSDK extends CsmSDKModule<{
  tx: TxSDK;
  operator: OperatorSDK;
  keysCache: KeysCacheSDK;
}> {
  private readonly gateName: VettedGateContractName;
  private readonly contract: BindedContract<typeof VettedGateAbi>;

  constructor(props: CsmSDKProps, gateName: VettedGateContractName) {
    super(props, gateName);
    this.gateName = gateName;
    this.contract = this.core.getContract(gateName);
  }

  private async parseOperatorFromReceipt(receipt: ReceiptLike) {
    const nodeOperatorId = await parseNodeOperatorAddedEvents(receipt);
    return this.bus.operator.getManagementProperties(nodeOperatorId);
  }

  private buildAddNodeOperatorETH(
    props: AddVettedNodeOperatorProps,
  ): PerformOptionsNoSpend<NodeOperatorShortInfo> {
    const { depositData } = props;
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      proof,
      referrer,
      ...rest
    } = parseAddOperatorProps(props);

    return {
      ...rest,
      callback: withKeysCacheCallback(
        this.bus.keysCache,
        depositData,
        rest.callback,
      ),
      call: () =>
        this.contract.encode.addNodeOperatorETH(
          [
            keysCount,
            publicKeys,
            signatures,
            managementProperties,
            proof,
            referrer,
          ],
          { value: amount },
        ),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    };
  }

  private buildAddNodeOperatorStETH(
    props: AddVettedNodeOperatorProps,
  ): PerformOptionsSpend<NodeOperatorShortInfo> {
    const { depositData } = props;
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      proof,
      referrer,
      permit,
      ...rest
    } = parseAddOperatorProps(props);

    return {
      ...rest,
      callback: withKeysCacheCallback(
        this.bus.keysCache,
        depositData,
        rest.callback,
      ),
      spend: { token: TOKENS.steth, amount, permit },
      call: ({ permit: signedPermit }) =>
        this.contract.encode.addNodeOperatorStETH([
          keysCount,
          publicKeys,
          signatures,
          managementProperties,
          signedPermit,
          proof,
          referrer,
        ]),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    };
  }

  private buildAddNodeOperatorWstETH(
    props: AddVettedNodeOperatorProps,
  ): PerformOptionsSpend<NodeOperatorShortInfo> {
    const { depositData } = props;
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      proof,
      referrer,
      permit,
      ...rest
    } = parseAddOperatorProps(props);

    return {
      ...rest,
      callback: withKeysCacheCallback(
        this.bus.keysCache,
        depositData,
        rest.callback,
      ),
      spend: { token: TOKENS.wsteth, amount, permit },
      call: ({ permit: signedPermit }) =>
        this.contract.encode.addNodeOperatorWstETH([
          keysCount,
          publicKeys,
          signatures,
          managementProperties,
          signedPermit,
          proof,
          referrer,
        ]),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    };
  }

  private buildAddNodeOperator(
    props: WithToken<AddVettedNodeOperatorProps>,
  ): PerformOptions<NodeOperatorShortInfo> {
    switch (props.token) {
      case TOKENS.eth:
        return this.buildAddNodeOperatorETH(props);
      case TOKENS.steth:
        return this.buildAddNodeOperatorStETH(props);
      case TOKENS.wsteth:
        return this.buildAddNodeOperatorWstETH(props);
      default:
        throw new SDKError({
          message: 'unsupported token',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorETH(props: AddVettedNodeOperatorProps) {
    return this.bus.tx.perform(this.buildAddNodeOperatorETH(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorStETH(props: AddVettedNodeOperatorProps) {
    return this.bus.tx.perform(this.buildAddNodeOperatorStETH(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorWstETH(props: AddVettedNodeOperatorProps) {
    return this.bus.tx.perform(this.buildAddNodeOperatorWstETH(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperator(props: WithToken<AddVettedNodeOperatorProps>) {
    return this.bus.tx.perform(this.buildAddNodeOperator(props));
  }

  @EstimateView()
  public async estimateAddNodeOperator(
    props: WithToken<AddVettedNodeOperatorProps>,
  ) {
    return this.bus.tx.estimate(this.buildAddNodeOperator(props));
  }

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

  @Logger('Utils:')
  public getProofTreeUrls(cid: string): string[] {
    return [
      ...this.core.getIpfsUrls(cid),
      this.core.getMerkleTreeFallback(this.gateName),
    ].filter(isDefined);
  }

  @Cache(CACHE_IMMUTABLE)
  private async loadTree(cid: string, root: Hex) {
    const urls = this.getProofTreeUrls(cid);

    return fetchTree<AddressTreeLeaf>({ urls, root });
  }

  @Logger('API:')
  public async getProofTree() {
    const { root, cid } = await this.getTreeConfig();

    if (!root || !cid) {
      return null;
    }

    return this.loadTree(cid, root);
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

  private buildClaimCurve(props: ClaimCurveProps): PerformOptionsNoSpend {
    const { nodeOperatorId, proof, ...rest } = props;

    return {
      ...rest,
      call: () => this.contract.encode.claimBondCurve([nodeOperatorId, proof]),
    };
  }

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async claimCurve(props: ClaimCurveProps) {
    return this.bus.tx.perform(this.buildClaimCurve(props));
  }

  @EstimateView()
  public async estimateClaimCurve(props: ClaimCurveProps) {
    return this.bus.tx.estimate(this.buildClaimCurve(props));
  }
}
