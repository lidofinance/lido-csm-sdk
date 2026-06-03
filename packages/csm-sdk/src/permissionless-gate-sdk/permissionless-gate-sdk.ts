import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
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
import { ReceiptLike } from '../tx-sdk/types';
import { AddNodeOperatorProps } from './types';

export class PermissionlessGateSDK extends CsmSDKModule<{
  tx: TxSDK;
  operator: OperatorSDK;
  keysCache?: KeysCacheSDK;
}> {
  private get permissionlessContract() {
    return this.core.getContract(CONTRACT_NAMES.permissionlessGate);
  }

  private async parseOperatorFromReceipt(receipt: ReceiptLike) {
    const nodeOperatorId = await parseNodeOperatorAddedEvents(receipt);
    return this.bus.operator.getManagementProperties(nodeOperatorId);
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorETH(props: AddNodeOperatorProps) {
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

    return this.bus.tx.perform<NodeOperatorShortInfo>({
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
    });
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorStETH(props: AddNodeOperatorProps) {
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

    return this.bus.tx.perform<NodeOperatorShortInfo>({
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
    });
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorWstETH(props: AddNodeOperatorProps) {
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

    return this.bus.tx.perform<NodeOperatorShortInfo>({
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
    });
  }

  @Access({ level: AccessLevel.ANYONE })
  public async addNodeOperator(props: WithToken<AddNodeOperatorProps>) {
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
    return this.permissionlessContract.read.CURVE_ID();
  }
}
