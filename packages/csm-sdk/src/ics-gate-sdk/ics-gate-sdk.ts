import {
  ERROR_CODE,
  SDKError,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import {
  Address,
  decodeEventLog,
  getAbiItem,
  GetContractReturnType,
  isAddress,
  toEventHash,
  TransactionReceipt,
  WalletClient,
  zeroAddress,
} from 'viem';
import { CSModuleAbi, VettedGateAbi } from '../abi/index.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  EMPTY_PERMIT,
  NodeOperatorId,
  PermitSignatureShort,
  Proof,
  TOKENS,
  WithToken,
} from '../common/index.js';
import {
  fetchWithFallback,
  parseDepositData,
  stripPermit,
} from '../common/utils/index.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import type { AddNodeOperatorResult } from '../permissionless-gate-sdk/types.js';
import { SpendingSDK } from '../spending-sdk/spending-sdk.js';
import { SignPermitOrApproveProps } from '../spending-sdk/types.js';
import { fetchAddressesTree } from './fetch-proofs-tree.js';
import { findProof } from './find-proof.js';
import {
  AddressProof,
  AddVettedNodeOperatorInnerProps,
  AddVettedNodeOperatorProps,
  ClaimCuvrveProps,
} from './types.js';
import { onError } from './on-error.js';

const NODE_OPERATOR_ADDED_EVENT = getAbiItem({
  abi: CSModuleAbi,
  name: 'NodeOperatorAdded',
});
const NODE_OPERATOR_ADDED_SIGNATURE = toEventHash(NODE_OPERATOR_ADDED_EVENT);

export class IcsGateSDK extends CsmSDKModule<{
  spending: SpendingSDK;
  operator: OperatorSDK;
}> {
  private get contract(): GetContractReturnType<
    typeof VettedGateAbi,
    WalletClient
  > {
    return this.core.getContractVettedGate();
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorETH(
    props: AddVettedNodeOperatorProps,
  ): Promise<TransactionResult<AddNodeOperatorResult>> {
    const {
      amount: value,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      proof,
      referrer,
      permit,
      ...rest
    } = await this.parseProps(props);

    const args = [
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      proof,
      referrer,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.addNodeOperatorETH(args, {
          value,
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.addNodeOperatorETH(args, {
          value,
          ...options,
        }),
      decodeResult: (receipt) => this.receiptParseEvents(receipt),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorStETH(
    props: AddVettedNodeOperatorProps,
  ): Promise<TransactionResult<AddNodeOperatorResult>> {
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      proof,
      referrer,
      permit: _permit,
      ...rest
    } = await this.parseProps(props);

    const { hash, permit } = await this.getPermit(
      { token: TOKENS.steth, amount, ...rest } as any,
      _permit,
    );
    if (hash) return { hash };

    const args = [
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      permit,
      proof,
      referrer,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.addNodeOperatorStETH(args, options),
      sendTransaction: (options) =>
        this.contract.write.addNodeOperatorStETH(args, options),
      decodeResult: (receipt) => this.receiptParseEvents(receipt),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorWstETH(
    props: AddVettedNodeOperatorProps,
  ): Promise<TransactionResult<AddNodeOperatorResult>> {
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      proof,
      referrer,
      permit: _permit,
      ...rest
    } = await this.parseProps(props);

    const { hash, permit } = await this.getPermit(
      { token: TOKENS.wsteth, amount, ...rest } as any,
      _permit,
    );
    if (hash) return { hash };

    const args = [
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      permit,
      proof,
      referrer,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.addNodeOperatorWstETH(args, options),
      sendTransaction: (options) =>
        this.contract.write.addNodeOperatorWstETH(args, options),
      decodeResult: (receipt) => this.receiptParseEvents(receipt),
    });
  }

  public async addNodeOperator(
    props: WithToken<AddVettedNodeOperatorProps>,
  ): Promise<TransactionResult<AddNodeOperatorResult>> {
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

  @Logger('Utils:')
  private async parseProps(
    props: AddVettedNodeOperatorProps,
  ): Promise<AddVettedNodeOperatorInnerProps> {
    const { keysCount, publicKeys, signatures } = parseDepositData(
      props.depositData,
    );
    return {
      ...props,
      keysCount,
      publicKeys,
      signatures,
      managementProperties: {
        rewardAddress:
          props.rewardsAddress && isAddress(props.rewardsAddress)
            ? props.rewardsAddress
            : zeroAddress,
        managerAddress:
          props.managerAddress && isAddress(props.managerAddress)
            ? props.managerAddress
            : zeroAddress,
        extendedManagerPermissions: props.extendedManagerPermissions ?? false,
      },
      referrer:
        props.referrer && isAddress(props.referrer)
          ? props.referrer
          : zeroAddress,
    };
  }

  // FIXME: duplicate
  @Logger('Utils:')
  private async getPermit(
    props: SignPermitOrApproveProps,
    preparedPermit?: PermitSignatureShort,
  ) {
    if (preparedPermit) return { permit: stripPermit(preparedPermit) };
    const result = await this.bus?.get('spending')?.signPermitOrApprove(props);
    return {
      hash: result?.hash,
      permit: stripPermit(result?.permit ?? EMPTY_PERMIT),
    };
  }

  @Logger('Utils:')
  private async receiptParseEvents(
    receipt: TransactionReceipt,
  ): Promise<AddNodeOperatorResult> {
    for (const log of receipt.logs) {
      // skips non-relevant events
      if (log.topics[0] !== NODE_OPERATOR_ADDED_SIGNATURE) continue;
      const parsedLog = decodeEventLog({
        abi: [NODE_OPERATOR_ADDED_EVENT],
        strict: true,
        ...log,
      });
      return {
        nodeOperatorId: parsedLog.args.nodeOperatorId,
        managerAddress: parsedLog.args.managerAddress,
        rewardsAddress: parsedLog.args.rewardAddress,
      };
    }
    throw new SDKError({
      message: 'could not find NodeOperatorAdded event in transaction',
      code: ERROR_CODE.TRANSACTION_ERROR,
    });
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
    return [`https://ipfs.io/ipfs/${cid}`].filter((v) => v !== undefined);
  }

  @Logger('API:')
  @Cache(300 * 60 * 1000)
  public async getProofTree() {
    const { root, cid } = await this.getTreeConfig();

    if (!root || !cid) {
      return null;
    }

    const urls = this.getProofTreeUrls(cid);

    return fetchWithFallback(urls, (url) => fetchAddressesTree(url, root));
  }

  @Logger('Utils:')
  public async getProof(address: Address): Promise<Proof | null> {
    const proofTree = await this.getProofTree();
    if (!proofTree) return null;
    return findProof(proofTree, address);
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
  public async canClaimCurve(
    address: Address,
    nodeOperatorId: NodeOperatorId,
  ): Promise<boolean> {
    const [isPaused, isOwner] = await Promise.all([
      this.isPaused(),
      this.bus.getOrThrow('operator').isOwner(nodeOperatorId, address),
    ]);

    return !isPaused && isOwner;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async verifyProof(address: Address, proof: Proof): Promise<boolean> {
    return this.contract.read.verifyProof([address, proof]);
  }

  @Logger('Call:')
  @ErrorHandler()
  public async claimCurve(props: ClaimCuvrveProps): Promise<TransactionResult> {
    const { nodeOperatorId, proof, ...rest } = props;

    const args = [nodeOperatorId, proof] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.claimBondCurve(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.claimBondCurve(args, {
          ...options,
        }),
    });
  }
}
