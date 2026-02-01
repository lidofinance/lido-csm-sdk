import { ERROR_CODE, SDKError } from '@lidofinance/lido-ethereum-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { CONTRACT_NAMES, TOKENS, WithToken } from '../common/index.js';
import { parseNodeOperatorAddedEvents } from '../common/utils/index.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { ReceiptLike } from '../tx-sdk/types.js';
import { parseAddOperatorProps } from './parse-add-operator-props.js';
import { AddNodeOperatorProps } from './types.js';

export class PermissionlessGateSDK extends CsmSDKModule<{
  tx: TxSDK;
  operator: OperatorSDK;
}> {
  private get permissionlessContract() {
    return this.core.getContract(CONTRACT_NAMES.permissionlessGate);
  }

  private async parseOperatorFromReceipt(receipt: ReceiptLike) {
    const nodeOperatorId = await parseNodeOperatorAddedEvents(receipt);
    return this.bus.operator.getManagementProperties(nodeOperatorId);
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorETH(props: AddNodeOperatorProps) {
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      referrer,
      ...rest
    } = await parseAddOperatorProps(props);

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.permissionlessContract,
          'addNodeOperatorETH',
          [keysCount, publicKeys, signatures, managementProperties, referrer],
          amount,
        ),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorStETH(props: AddNodeOperatorProps) {
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      referrer,
      permit,
      ...rest
    } = await parseAddOperatorProps(props);

    return this.bus.tx.perform({
      ...rest,
      spend: { token: TOKENS.steth, amount, permit },
      call: ({ permit }) =>
        prepCall(this.permissionlessContract, 'addNodeOperatorStETH', [
          keysCount,
          publicKeys,
          signatures,
          managementProperties,
          permit,
          referrer,
        ]),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addNodeOperatorWstETH(props: AddNodeOperatorProps) {
    const {
      amount,
      keysCount,
      publicKeys,
      signatures,
      managementProperties,
      referrer,
      permit,
      ...rest
    } = await parseAddOperatorProps(props);

    return this.bus.tx.perform({
      ...rest,
      spend: { token: TOKENS.wsteth, amount, permit },
      call: ({ permit }) =>
        prepCall(this.permissionlessContract, 'addNodeOperatorWstETH', [
          keysCount,
          publicKeys,
          signatures,
          managementProperties,
          permit,
          referrer,
        ]),
      decodeResult: (receipt) => this.parseOperatorFromReceipt(receipt),
    });
  }

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
