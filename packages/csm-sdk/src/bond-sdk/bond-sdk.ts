import {
  ERROR_CODE,
  SDKError,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { GetContractReturnType, WalletClient } from 'viem';
import { CSAccountingAbi } from '../abi/CSAccounting.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { EMPTY_PERMIT, TOKENS, WithToken } from '../common/index.js';
import { PermitSignature } from '../core-sdk/types.js';
import { SpendingSDK } from '../spending-sdk/spending-sdk.js';
import { SignPermitOrApproveProps } from '../spending-sdk/types.js';
import {
  AddBondProps,
  ClaimBondProps,
  CoverLockedBondProps,
  PullRewardsProps,
} from './types.js';

export class BondSDK extends CsmSDKModule<{
  spending: SpendingSDK;
}> {
  private get contract(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.core.getContractCSAccounting();
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addBondETH(props: AddBondProps): Promise<TransactionResult> {
    const { nodeOperatorId, amount: value, permit, ...rest } = props;

    const args = [nodeOperatorId] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.depositETH(args, {
          value,
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.depositETH(args, {
          value,
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addBondStETH(props: AddBondProps): Promise<TransactionResult> {
    const { nodeOperatorId, amount, permit: _permit, ...rest } = props;

    // FIXME: pass callback
    const permit = await this.getPermit(
      { token: TOKENS.steth, amount },
      _permit,
    );

    const args = [nodeOperatorId, amount, permit] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.depositStETH(args, options),
      sendTransaction: (options) =>
        this.contract.write.depositStETH(args, options),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addBondWstETH(props: AddBondProps): Promise<TransactionResult> {
    const { nodeOperatorId, amount, permit: _permit, ...rest } = props;

    // FIXME: pass callback
    const permit = await this.getPermit(
      { token: TOKENS.wsteth, amount },
      _permit,
    );

    const args = [nodeOperatorId, amount, permit] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.depositWstETH(args, options),
      sendTransaction: (options) =>
        this.contract.write.depositWstETH(args, options),
    });
  }

  public async addBond(
    props: WithToken<AddBondProps>,
  ): Promise<TransactionResult> {
    const { token } = props;
    switch (token) {
      case TOKENS.eth:
        return this.addBondETH(props);
      case TOKENS.steth:
        return this.addBondStETH(props);
      case TOKENS.wsteth:
        return this.addBondWstETH(props);
      default:
        throw new SDKError({
          message: 'unsupported token',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }

  // TODO: cast to PermitSignatureShort?
  @Logger('Utils:')
  private async getPermit(
    props: SignPermitOrApproveProps,
    preparedPermit?: PermitSignature,
  ) {
    if (preparedPermit) return preparedPermit;
    const result = await this.bus?.get('spending')?.signPermitOrApprove(props);
    return result?.permit ?? EMPTY_PERMIT;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async coverLockedBonc(
    props: CoverLockedBondProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, amount: value, ...rest } = props;

    const args = [nodeOperatorId] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.compensateLockedBondETH(args, {
          value,
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.compensateLockedBondETH(args, {
          value,
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async pullRewards(
    props: PullRewardsProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, cumulativeFeeShares, rewardsProof, ...rest } =
      props;

    const args = [nodeOperatorId, cumulativeFeeShares, rewardsProof] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.pullFeeRewards(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.pullFeeRewards(args, {
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async claimBondUnstETH(
    props: ClaimBondProps,
  ): Promise<TransactionResult> {
    const {
      nodeOperatorId,
      amount,
      cumulativeFeeShares,
      rewardsProof,
      ...rest
    } = props;

    const args = [
      nodeOperatorId,
      amount,
      cumulativeFeeShares,
      rewardsProof,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.claimRewardsUnstETH(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.claimRewardsUnstETH(args, {
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async claimBondStETH(
    props: ClaimBondProps,
  ): Promise<TransactionResult> {
    const {
      nodeOperatorId,
      amount,
      cumulativeFeeShares,
      rewardsProof,
      ...rest
    } = props;

    const args = [
      nodeOperatorId,
      amount,
      cumulativeFeeShares,
      rewardsProof,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.claimRewardsStETH(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.claimRewardsStETH(args, {
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async claimBondWstETH(
    props: ClaimBondProps,
  ): Promise<TransactionResult> {
    const {
      nodeOperatorId,
      amount,
      cumulativeFeeShares,
      rewardsProof,
      ...rest
    } = props;

    const args = [
      nodeOperatorId,
      amount,
      cumulativeFeeShares,
      rewardsProof,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.claimRewardsWstETH(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.claimRewardsWstETH(args, {
          ...options,
        }),
    });
  }

  public async claimBond(
    props: WithToken<ClaimBondProps>,
  ): Promise<TransactionResult> {
    const { token } = props;

    if (props.amount === 0n) {
      return this.pullRewards(props);
    }

    switch (token) {
      case TOKENS.eth:
        return this.claimBondUnstETH(props);
      case TOKENS.steth:
        return this.claimBondStETH(props);
      case TOKENS.wsteth:
        return this.claimBondWstETH(props);
      default:
        throw new SDKError({
          message: 'unsupported token',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }
}
