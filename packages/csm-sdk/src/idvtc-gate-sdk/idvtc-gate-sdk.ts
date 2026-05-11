import { Address } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  Cache,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import {
  CACHE_LONG,
  CONTRACT_NAMES,
  ERROR_CODE,
  Proof,
  SDKError,
  TOKENS,
  WithToken,
} from '../common/index';
import {
  fetchTree,
  findAddressProof,
  isDefined,
  onError,
  parseNodeOperatorAddedEvents,
} from '../common/utils/index';
import {
  AddressesTreeLeaf,
  AddressProof,
  AddVettedNodeOperatorProps,
  ClaimCuvrveProps,
  parseAddVettedOperatorProps,
} from '../ics-gate-sdk/index';
import { OperatorSDK } from '../operator-sdk/operator-sdk';
import { prepCall, TxSDK } from '../tx-sdk/index';
import { ReceiptLike } from '../tx-sdk/types';

export class IdvtcGateSDK extends CsmSDKModule<{
  tx: TxSDK;
  operator: OperatorSDK;
}> {
  private get idvtcContract() {
    return this.core.getContract(CONTRACT_NAMES.idvtcGate);
  }

  private async parseOperatorFromReceipt(receipt: ReceiptLike) {
    const nodeOperatorId = await parseNodeOperatorAddedEvents(receipt);
    return this.bus.operator.getManagementProperties(nodeOperatorId);
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorETH(props: AddVettedNodeOperatorProps) {
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      proof,
      referrer,
      ...rest
    } = await parseAddVettedOperatorProps(props);

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.idvtcContract,
          'addNodeOperatorETH',
          [
            keysCount,
            publicKeys,
            signatures,
            managementProperties,
            proof,
            referrer,
          ],
          amount,
        ),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    });
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorStETH(props: AddVettedNodeOperatorProps) {
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
    } = await parseAddVettedOperatorProps(props);

    return this.bus.tx.perform({
      ...rest,
      spend: { token: TOKENS.steth, amount, permit },
      call: ({ permit }) =>
        prepCall(this.idvtcContract, 'addNodeOperatorStETH', [
          keysCount,
          publicKeys,
          signatures,
          managementProperties,
          permit,
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
    } = await parseAddVettedOperatorProps(props);

    return this.bus.tx.perform({
      ...rest,
      spend: { token: TOKENS.wsteth, amount, permit },
      call: ({ permit }) =>
        prepCall(this.idvtcContract, 'addNodeOperatorWstETH', [
          keysCount,
          publicKeys,
          signatures,
          managementProperties,
          permit,
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
    return this.idvtcContract.read.curveId();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getTreeConfig() {
    const [root, cid] = await Promise.all([
      this.idvtcContract.read.treeRoot(),
      this.idvtcContract.read.treeCid(),
    ]).catch(onError);
    return { root, cid };
  }

  @Logger('Utils:')
  public getProofTreeUrls(cid: string): string[] {
    return [...this.core.getIpfsUrls(cid), this.core.idvtcTreeLink].filter(
      isDefined,
    );
  }

  @Logger('API:')
  @Cache(CACHE_LONG)
  public async getProofTree() {
    const { root, cid } = await this.getTreeConfig();

    if (!root || !cid) {
      return null;
    }

    const urls = this.getProofTreeUrls(cid);

    return fetchTree<AddressesTreeLeaf>({
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
    return this.idvtcContract.read.isConsumed([address]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async isPaused(): Promise<boolean> {
    return this.idvtcContract.read.isPaused();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async verifyProof(address: Address, proof: Proof): Promise<boolean> {
    return this.idvtcContract.read.verifyProof([address, proof]);
  }

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async claimCurve(props: ClaimCuvrveProps) {
    const { nodeOperatorId, proof, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.idvtcContract, 'claimBondCurve', [nodeOperatorId, proof]),
    });
  }
}
