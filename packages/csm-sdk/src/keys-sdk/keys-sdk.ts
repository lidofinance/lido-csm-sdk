import { zeroAddress } from 'viem';
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
import {
  PerformOptions,
  PerformOptionsNoSpend,
  PerformOptionsSpend,
} from '../tx-sdk/types';
import { parseAddKeysProps } from './parse-add-keys-props';
import { AddKeysProps, EjectKeysByArrayProps, RemoveKeysProps } from './types';

export class KeysSDK extends CsmSDKModule<{
  tx: TxSDK;
  keysCache: KeysCacheSDK;
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

  private async buildAddKeysETH(
    props: AddKeysProps,
  ): Promise<PerformOptionsNoSpend> {
    const {
      nodeOperatorId,
      amount,
      keysCount,
      publicKeys,
      signatures,
      permit: _permit,
      ...rest
    } = await parseAddKeysProps(props);

    return {
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
    };
  }

  private async buildAddKeysStETH(
    props: AddKeysProps,
  ): Promise<PerformOptionsSpend> {
    const {
      nodeOperatorId,
      amount,
      keysCount,
      publicKeys,
      signatures,
      permit,
      ...rest
    } = await parseAddKeysProps(props);

    return {
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
    };
  }

  private async buildAddKeysWstETH(
    props: AddKeysProps,
  ): Promise<PerformOptionsSpend> {
    const {
      nodeOperatorId,
      amount,
      keysCount,
      publicKeys,
      signatures,
      permit,
      ...rest
    } = await parseAddKeysProps(props);

    return {
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
    };
  }

  private async buildAddKeys(
    props: WithToken<AddKeysProps>,
  ): Promise<PerformOptions> {
    switch (props.token) {
      case TOKENS.eth:
        return this.buildAddKeysETH(props);
      case TOKENS.steth:
        return this.buildAddKeysStETH(props);
      case TOKENS.wsteth:
        return this.buildAddKeysWstETH(props);
      default:
        throw new SDKError({
          message: 'unsupported token',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }

  private buildRemoveKeys(props: RemoveKeysProps): PerformOptionsNoSpend {
    const { nodeOperatorId, startIndex, keysCount, pubkeys, ...rest } = props;

    return {
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
    };
  }

  private buildEjectKeys(props: EjectKeysByArrayProps): PerformOptionsNoSpend {
    const {
      nodeOperatorId,
      keyIndices,
      amount,
      refundRecipient = zeroAddress,
      ...rest
    } = props;

    return {
      ...rest,
      call: () =>
        this.ejectorContract.encode.voluntaryEject(
          [nodeOperatorId, keyIndices, refundRecipient],
          { value: amount },
        ),
    };
  }

  @Access({ level: AccessLevel.MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async addKeysETH(props: AddKeysProps) {
    return this.bus.tx.perform(await this.buildAddKeysETH(props));
  }

  @Access({ level: AccessLevel.MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async addKeysStETH(props: AddKeysProps) {
    return this.bus.tx.perform(await this.buildAddKeysStETH(props));
  }

  @Access({ level: AccessLevel.MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async addKeysWstETH(props: AddKeysProps) {
    return this.bus.tx.perform(await this.buildAddKeysWstETH(props));
  }

  @Access({ level: AccessLevel.MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async addKeys(props: WithToken<AddKeysProps>) {
    return this.bus.tx.perform(await this.buildAddKeys(props));
  }

  @EstimateView()
  public async estimateAddKeys(props: WithToken<AddKeysProps>) {
    return this.bus.tx.estimate(await this.buildAddKeys(props));
  }

  @Access({ level: AccessLevel.MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async removeKeys(props: RemoveKeysProps) {
    return this.bus.tx.perform(this.buildRemoveKeys(props));
  }

  @EstimateView()
  public async estimateRemoveKeys(props: RemoveKeysProps) {
    return this.bus.tx.estimate(this.buildRemoveKeys(props));
  }

  @Access({ level: AccessLevel.OWNER })
  @Logger('Call:')
  @ErrorHandler()
  public async ejectKeys(props: EjectKeysByArrayProps) {
    return this.bus.tx.perform(this.buildEjectKeys(props));
  }

  @EstimateView()
  public async estimateEjectKeys(props: EjectKeysByArrayProps) {
    return this.bus.tx.estimate(this.buildEjectKeys(props));
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
