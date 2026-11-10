import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  EstimateView,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import {
  CONTRACT_NAMES,
  ERROR_CODE,
  NodeOperatorShortInfo,
  SDKError,
  TOKENS,
  WithToken,
} from '../common/index';
import {
  parseAddOperatorProps,
  parseNodeOperatorAddedEvents,
} from '../common/utils/index';
import { KeysCacheSDK, withKeysCacheCallback } from '../keys-cache-sdk/index';
import { OperatorSDK } from '../operator-sdk/operator-sdk';
import { TxSDK } from '../tx-sdk/index';
import {
  PerformOptions,
  PerformOptionsNoSpend,
  PerformOptionsSpend,
  ReceiptLike,
} from '../tx-sdk/types';
import { AddNodeOperatorProps } from './types';

export class PermissionlessGateSDK extends CsmSDKModule<{
  tx: TxSDK;
  operator: OperatorSDK;
  keysCache: KeysCacheSDK;
}> {
  private get permissionlessContract() {
    return this.core.getContract(CONTRACT_NAMES.permissionlessGate);
  }

  private async parseOperatorFromReceipt(receipt: ReceiptLike) {
    const nodeOperatorId = await parseNodeOperatorAddedEvents(receipt);
    return this.bus.operator.getManagementProperties(nodeOperatorId);
  }

  private buildAddNodeOperatorETH(
    props: AddNodeOperatorProps,
  ): PerformOptionsNoSpend<NodeOperatorShortInfo> {
    const { depositData } = props;
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
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
        this.permissionlessContract.encode.addNodeOperatorETH(
          [keysCount, publicKeys, signatures, managementProperties, referrer],
          { value: amount },
        ),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    };
  }

  private buildAddNodeOperatorStETH(
    props: AddNodeOperatorProps,
  ): PerformOptionsSpend<NodeOperatorShortInfo> {
    const { depositData } = props;
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
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
        this.permissionlessContract.encode.addNodeOperatorStETH([
          keysCount,
          publicKeys,
          signatures,
          managementProperties,
          signedPermit,
          referrer,
        ]),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    };
  }

  private buildAddNodeOperatorWstETH(
    props: AddNodeOperatorProps,
  ): PerformOptionsSpend<NodeOperatorShortInfo> {
    const { depositData } = props;
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
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
        this.permissionlessContract.encode.addNodeOperatorWstETH([
          keysCount,
          publicKeys,
          signatures,
          managementProperties,
          signedPermit,
          referrer,
        ]),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    };
  }

  private buildAddNodeOperator(
    props: WithToken<AddNodeOperatorProps>,
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
  public async addNodeOperatorETH(props: AddNodeOperatorProps) {
    return this.bus.tx.perform(this.buildAddNodeOperatorETH(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorStETH(props: AddNodeOperatorProps) {
    return this.bus.tx.perform(this.buildAddNodeOperatorStETH(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorWstETH(props: AddNodeOperatorProps) {
    return this.bus.tx.perform(this.buildAddNodeOperatorWstETH(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperator(props: WithToken<AddNodeOperatorProps>) {
    return this.bus.tx.perform(this.buildAddNodeOperator(props));
  }

  @EstimateView()
  public async estimateAddNodeOperator(props: WithToken<AddNodeOperatorProps>) {
    return this.bus.tx.estimate(this.buildAddNodeOperator(props));
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getCurveId(): Promise<bigint> {
    return this.permissionlessContract.read.CURVE_ID();
  }
}
