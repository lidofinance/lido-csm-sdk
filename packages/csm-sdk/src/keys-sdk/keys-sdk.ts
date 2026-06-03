import { zeroAddress } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import {
  CONTRACT_NAMES,
  EJECT_FEE_MIN_LIMIT,
  EJECT_FEE_MULTIPLIEER,
  ERROR_CODE,
  SDKError,
  TOKENS,
  WithToken,
} from '../common/index';
import {
  KeysCacheSDK,
  withKeysCacheCallback,
  withKeysRemovalCacheCallback,
} from '../keys-cache-sdk/index';
import { TxSDK } from '../tx-sdk/index';
import { parseAddKeysProps } from './parse-add-keys-props';
import { AddKeysProps, EjectKeysByArrayProps, RemoveKeysProps } from './types';

export class KeysSDK extends CsmSDKModule<{
  tx: TxSDK;
  keysCache?: KeysCacheSDK;
}> {
  private get moduleContract() {
    return this.core.contractBaseModule;
  }

  private get ejectorContract() {
    return this.core.getContract(CONTRACT_NAMES.ejector);
  }

  private get withdrawalVaultContract() {
    return this.core.getContract(CONTRACT_NAMES.withdrawalVault);
  }

  @Access({ level: AccessLevel.MANAGER })
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
      callback: withKeysCacheCallback(
        this.bus.keysCache,
        props.depositData,
        rest.callback,
      ),
      call: ({ from }) =>
        this.moduleContract.encode.addValidatorKeysETH(
          [from, nodeOperatorId, keysCount, publicKeys, signatures],
          { value: amount },
        ),
    });
  }

  @Access({ level: AccessLevel.MANAGER })
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
      callback: withKeysCacheCallback(
        this.bus.keysCache,
        props.depositData,
        rest.callback,
      ),
      spend: { token: TOKENS.steth, amount, permit },
      call: ({ from, permit }) =>
        this.moduleContract.encode.addValidatorKeysStETH([
          from,
          nodeOperatorId,
          keysCount,
          publicKeys,
          signatures,
          permit,
        ]),
    });
  }

  @Access({ level: AccessLevel.MANAGER })
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
      callback: withKeysCacheCallback(
        this.bus.keysCache,
        props.depositData,
        rest.callback,
      ),
      spend: { token: TOKENS.wsteth, amount, permit },
      call: ({ from, permit }) =>
        this.moduleContract.encode.addValidatorKeysWstETH([
          from,
          nodeOperatorId,
          keysCount,
          publicKeys,
          signatures,
          permit,
        ]),
    });
  }

  @Access({ level: AccessLevel.MANAGER })
  public async addKeys(props: WithToken<AddKeysProps>) {
    const { token, amount } = props;

    if (amount === 0n) {
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

  @Access({ level: AccessLevel.MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async removeKeys(props: RemoveKeysProps) {
    const { nodeOperatorId, startIndex, keysCount, pubkeys, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      callback: withKeysRemovalCacheCallback(
        this.bus.keysCache,
        pubkeys,
        rest.callback,
      ),
      call: () =>
        this.moduleContract.encode.removeKeys([
          nodeOperatorId,
          startIndex,
          keysCount,
        ]),
    });
  }

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async ejectKeys(props: EjectKeysByArrayProps) {
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
        this.ejectorContract.encode.voluntaryEject(
          [nodeOperatorId, keyIndices, refundRecipient],
          { value: amount },
        ),
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getEjectFeePerKey() {
    const fee =
      await this.withdrawalVaultContract.read.getWithdrawalRequestFee();
    const correctedFee = fee * EJECT_FEE_MULTIPLIEER;
    return correctedFee < EJECT_FEE_MIN_LIMIT
      ? EJECT_FEE_MIN_LIMIT
      : correctedFee;
  }
}
