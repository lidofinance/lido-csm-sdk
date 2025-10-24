import {
  ERROR_CODE,
  SDKError,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import {
  decodeEventLog,
  getAbiItem,
  isAddress,
  toEventHash,
  TransactionReceipt,
  zeroAddress,
} from 'viem';
import { CSModuleAbi } from '../abi/index.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  EMPTY_PERMIT,
  NodeOperatorShortInfo,
  PermitSignatureShort,
  TOKENS,
  WithToken,
} from '../common/index.js';
import { parseDepositData, stripPermit } from '../common/utils/index.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { SpendingSDK } from '../spending-sdk/spending-sdk.js';
import { SignPermitOrApproveProps } from '../spending-sdk/types.js';
import { AddNodeOperatorInnerProps, AddNodeOperatorProps } from './types.js';

const NODE_OPERATOR_ADDED_EVENT = getAbiItem({
  abi: CSModuleAbi,
  name: 'NodeOperatorAdded',
});
const NODE_OPERATOR_ADDED_SIGNATURE = toEventHash(NODE_OPERATOR_ADDED_EVENT);

export class PermissionlessGateSDK extends CsmSDKModule<{
  spending: SpendingSDK;
  operator: OperatorSDK;
}> {
  private get permissionlessContract() {
    return this.core.contractPermissionlessGate;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorETH(
    props: AddNodeOperatorProps,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const {
      amount: value,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      referrer,
      permit,
      ...rest
    } = await this.parseProps(props);

    const args = [
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      referrer,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.permissionlessContract.estimateGas.addNodeOperatorETH(args, {
          value,
          ...options,
        }),
      sendTransaction: (options) =>
        this.permissionlessContract.write.addNodeOperatorETH(args, {
          value,
          ...options,
        }),
      decodeResult: (receipt) => this.receiptParseEvents(receipt),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorStETH(
    props: AddNodeOperatorProps,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      referrer,
      permit: _permit,
      ...rest
    } = await this.parseProps(props);

    const { hash, permit } = await this.getPermit(
      { ...rest, token: TOKENS.steth, amount } as SignPermitOrApproveProps,
      _permit,
    );
    if (hash) return { hash };

    const args = [
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      permit,
      referrer,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.permissionlessContract.estimateGas.addNodeOperatorStETH(
          args,
          options,
        ),
      sendTransaction: (options) =>
        this.permissionlessContract.write.addNodeOperatorStETH(args, options),
      decodeResult: (receipt) => this.receiptParseEvents(receipt),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorWstETH(
    props: AddNodeOperatorProps,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      referrer,
      permit: _permit,
      ...rest
    } = await this.parseProps(props);

    const { hash, permit } = await this.getPermit(
      { ...rest, token: TOKENS.wsteth, amount } as SignPermitOrApproveProps,
      _permit,
    );
    if (hash) return { hash };

    const args = [
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      permit,
      referrer,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.permissionlessContract.estimateGas.addNodeOperatorWstETH(
          args,
          options,
        ),
      sendTransaction: (options) =>
        this.permissionlessContract.write.addNodeOperatorWstETH(args, options),
      decodeResult: (receipt) => this.receiptParseEvents(receipt),
    });
  }

  public async addNodeOperator(
    props: WithToken<AddNodeOperatorProps>,
  ): Promise<TransactionResult<NodeOperatorShortInfo>> {
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
    props: AddNodeOperatorProps,
  ): Promise<AddNodeOperatorInnerProps> {
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
  ): Promise<NodeOperatorShortInfo> {
    for (const log of receipt.logs) {
      // skips non-relevant events
      if (log.topics[0] !== NODE_OPERATOR_ADDED_SIGNATURE) continue;
      const parsedLog = decodeEventLog({
        abi: [NODE_OPERATOR_ADDED_EVENT],
        strict: true,
        ...log,
      });

      const { nodeOperatorId } = parsedLog.args;
      return this.bus
        .getOrThrow('operator')
        .getManagementProperties(nodeOperatorId);
    }
    throw new SDKError({
      message: 'could not find NodeOperatorAdded event in transaction',
      code: ERROR_CODE.TRANSACTION_ERROR,
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getCurveId(): Promise<bigint> {
    return this.permissionlessContract.read.CURVE_ID();
  }
}
