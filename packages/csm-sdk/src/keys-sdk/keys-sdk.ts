import { ERROR_CODE, SDKError } from '@lidofinance/lido-ethereum-sdk';
import { zeroAddress } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  EJECT_FEE_MIN_LIMIT,
  EJECT_FEE_MULTIPLIEER,
  TOKENS,
  WithToken,
} from '../common/index.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { parseAddKeysProps } from './parse-add-keys-props.js';
import {
  AddKeysProps,
  EjectKeysByArrayProps,
  EjectKeysProps,
  NormalizeQueueProps,
  RemoveKeysProps,
} from './types.js';

export class KeysSDK extends CsmSDKModule<{ tx: TxSDK }> {
  private get moduleContract() {
    return this.core.contractCSModule;
  }

  private get ejectorContract() {
    return this.core.contractEjector;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addKeysETH(props: AddKeysProps) {
    const {
      nodeOperatorId,
      amount,
      keysCount,
      publicKeys,
      signatures,
      permit,
      ...rest
    } = await parseAddKeysProps(props);

    return this.bus.tx.perform({
      ...rest,
      call: ({ from }) =>
        prepCall(
          this.moduleContract,
          'addValidatorKeysETH',
          [from, nodeOperatorId, keysCount, publicKeys, signatures],
          amount,
        ),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addKeysStETH(props: AddKeysProps) {
    const {
      nodeOperatorId,
      amount,
      keysCount,
      publicKeys,
      signatures,
      permit,
      ...rest
    } = await parseAddKeysProps(props);

    return this.bus.tx.perform({
      ...rest,
      spend: { token: TOKENS.steth, amount, permit },
      call: ({ from, permit }) =>
        prepCall(this.moduleContract, 'addValidatorKeysStETH', [
          from,
          nodeOperatorId,
          keysCount,
          publicKeys,
          signatures,
          permit,
        ]),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addKeysWstETH(props: AddKeysProps) {
    const {
      nodeOperatorId,
      amount,
      keysCount,
      publicKeys,
      signatures,
      permit,
      ...rest
    } = await parseAddKeysProps(props);

    return this.bus.tx.perform({
      ...rest,
      spend: { token: TOKENS.wsteth, amount, permit },
      call: ({ from, permit }) =>
        prepCall(this.moduleContract, 'addValidatorKeysWstETH', [
          from,
          nodeOperatorId,
          keysCount,
          publicKeys,
          signatures,
          permit,
        ]),
    });
  }

  public async addKeys(props: WithToken<AddKeysProps>) {
    const { token } = props;

    if (props.amount === 0n) {
      return this.addKeysStETH(props);
    }

    switch (token) {
      case TOKENS.eth:
        return this.addKeysETH(props);
      case TOKENS.steth:
        return this.addKeysStETH(props);
      case TOKENS.wsteth:
        return this.addKeysWstETH(props);
      default:
        throw new SDKError({
          message: 'unsupported token',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }

  @Logger('Call:')
  @ErrorHandler()
  public async removeKeys(props: RemoveKeysProps) {
    const { nodeOperatorId, startIndex, keysCount, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'removeKeys', [
          nodeOperatorId,
          startIndex,
          keysCount,
        ]),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async ejectKeys(props: EjectKeysProps) {
    const {
      nodeOperatorId,
      startIndex,
      keysCount,
      amount,
      refundRecipient = zeroAddress,
      ...rest
    } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.ejectorContract,
          'voluntaryEject',
          [nodeOperatorId, startIndex, keysCount, refundRecipient],
          amount,
        ),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async ejectKeysByArray(props: EjectKeysByArrayProps) {
    const {
      nodeOperatorId,
      keyIndices,
      amount,
      refundRecipient = zeroAddress,
      ...rest
    } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.ejectorContract,
          'voluntaryEjectByArray',
          [nodeOperatorId, keyIndices, refundRecipient],
          amount,
        ),
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getEjectFeePerKey() {
    const fee =
      await this.core.contractWithdrawalVault.read.getWithdrawalRequestFee();
    const correctedFee = fee * EJECT_FEE_MULTIPLIEER;
    return correctedFee < EJECT_FEE_MIN_LIMIT
      ? EJECT_FEE_MIN_LIMIT
      : correctedFee;
  }

  // FIXME: move to Queue SDK
  @Logger('Call:')
  @ErrorHandler()
  public async normalizeQueue(props: NormalizeQueueProps) {
    const { nodeOperatorId, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'updateDepositableValidatorsCount', [
          nodeOperatorId,
        ]),
    });
  }
}
