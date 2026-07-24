import { Address } from 'viem';
import { VettedGateAbi } from '../abi/VettedGate';
import {
  CsmSDKModule,
  CsmSDKProps,
} from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  Cache,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import {
  CACHE_LONG,
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
import { ReceiptLike } from '../tx-sdk/types';
import {
  AddVettedNodeOperatorProps,
  ClaimCurveProps,
  VettedGateContractName,
} from './types';

export class VettedGateSDK extends CsmSDKModule<{
  tx: TxSDK;
  operator: OperatorSDK;
  keysCache?: KeysCacheSDK;
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

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorETH(props: AddVettedNodeOperatorProps) {
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

    return this.bus.tx.perform<NodeOperatorShortInfo>({
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
    });
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorStETH(props: AddVettedNodeOperatorProps) {
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

    return this.bus.tx.perform<NodeOperatorShortInfo>({
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
    });
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorWstETH(props: AddVettedNodeOperatorProps) {
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

    return this.bus.tx.perform<NodeOperatorShortInfo>({
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
    });
  }

  @Access({ level: AccessLevel.ANYONE })
  public async addNodeOperator(props: WithToken<AddVettedNodeOperatorProps>) {
    const { token } = props;
    switch (token) {
      case TOKENS.eth:
        return this.addNodeOperatorETH(props);
      case TOKENS.steth:
        return this.addNodeOperatorStETH(props);
      case TOKENS.wsteth:
        return this.addNodeOperatorWstETH(props);
      default:
        throw new SDKError({
          message: 'unsupported token',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
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

  @Logger('API:')
  @Cache(CACHE_LONG)
  public async getProofTree() {
    const { root, cid } = await this.getTreeConfig();

    if (!root || !cid) {
      return null;
    }

    const urls = this.getProofTreeUrls(cid);

    return fetchTree<AddressTreeLeaf>({
      urls,
      root,
    });
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

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async claimCurve(props: ClaimCurveProps) {
    const { nodeOperatorId, proof, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () => this.contract.encode.claimBondCurve([nodeOperatorId, proof]),
    });
  }
}
