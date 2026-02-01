import { ERROR_CODE, SDKError } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CONTRACT_NAMES,
  Proof,
  TOKENS,
  WithToken,
} from '../common/index.js';
import {
  fetchTree,
  findAddressProof,
  isDefined,
  onError,
  parseNodeOperatorAddedEvents,
} from '../common/utils/index.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { ReceiptLike } from '../tx-sdk/types.js';
import { parseAddVettedOperatorProps } from './parse-add-vetted-operator-props.js';
import {
  AddressesTreeLeaf,
  AddressProof,
  AddVettedNodeOperatorProps,
  ClaimCuvrveProps,
} from './types.js';

export class IcsGateSDK extends CsmSDKModule<{
  tx: TxSDK;
  operator: OperatorSDK;
}> {
  private get icsContract() {
    return this.core.getContract(CONTRACT_NAMES.vettedGate);
  }

  private async parseOperatorFromReceipt(receipt: ReceiptLike) {
    const nodeOperatorId = await parseNodeOperatorAddedEvents(receipt);
    return this.bus.operator.getManagementProperties(nodeOperatorId);
  }

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
          this.icsContract,
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
        prepCall(this.icsContract, 'addNodeOperatorStETH', [
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
        prepCall(this.icsContract, 'addNodeOperatorWstETH', [
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
    return this.icsContract.read.curveId();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getTreeConfig() {
    const [root, cid] = await Promise.all([
      this.icsContract.read.treeRoot(),
      this.icsContract.read.treeCid(),
    ]).catch(onError);
    return { root, cid };
  }

  @Logger('Utils:')
  public getProofTreeUrls(cid: string): string[] {
    return [...this.core.getIpfsUrls(cid), this.core.icsTreeLink].filter(
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
    return this.icsContract.read.isConsumed([address]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async isPaused(): Promise<boolean> {
    return this.icsContract.read.isPaused();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async verifyProof(address: Address, proof: Proof): Promise<boolean> {
    return this.icsContract.read.verifyProof([address, proof]);
  }

  @Logger('Call:')
  @ErrorHandler()
  public async claimCurve(props: ClaimCuvrveProps) {
    const { nodeOperatorId, proof, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.icsContract, 'claimBondCurve', [nodeOperatorId, proof]),
    });
  }
}
