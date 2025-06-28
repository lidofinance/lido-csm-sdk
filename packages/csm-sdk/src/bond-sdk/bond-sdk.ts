import {
  ERROR_CODE,
  SDKError,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import {
  decodeEventLog,
  getAbiItem,
  GetContractReturnType,
  toEventHash,
  TransactionReceipt,
  WalletClient,
} from 'viem';
import { CSAccountingAbi } from '../abi/CSAccounting.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  EMPTY_PERMIT,
  NodeOperatorId,
  PermitSignatureShort,
  RewardProof,
  TOKENS,
  WithToken,
} from '../common/index.js';
import { SpendingSDK } from '../spending-sdk/spending-sdk.js';
import { SignPermitOrApproveProps } from '../spending-sdk/types.js';
import {
  AddBondProps,
  AddBondResult,
  ClaimBondProps,
  CoverLockedBondProps,
  PullRewardsProps,
} from './types.js';
import { stripPermit } from '../common/utils/strip-permit.js';

const BOND_LOCK_CHANGED_EVENT = getAbiItem({
  abi: CSAccountingAbi,
  name: 'BondLockChanged',
});

const BOND_LOCK_CHANGED_SIGNATURE = toEventHash(BOND_LOCK_CHANGED_EVENT);

export class BondSDK extends CsmSDKModule<{
  spending: SpendingSDK;
}> {
  private get contract(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.core.getContractCSAccounting();
  }

  @Logger('Views:')
  @ErrorHandler()
  private async getBondSummary(id: NodeOperatorId): Promise<AddBondResult> {
    const [current, required] = await this.contract.read.getBondSummary([id]);
    return { current, required };
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addBondETH(
    props: AddBondProps,
  ): Promise<TransactionResult<AddBondResult>> {
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
      decodeResult: () => this.getBondSummary(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addBondStETH(
    props: AddBondProps,
  ): Promise<TransactionResult<AddBondResult>> {
    const { nodeOperatorId, amount, permit: _permit, ...rest } = props;

    const { hash, permit } = await this.getPermit(
      { token: TOKENS.steth, amount, ...rest } as any,
      _permit,
    );
    if (hash) return { hash };

    const args = [nodeOperatorId, amount, permit] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.depositStETH(args, options),
      sendTransaction: (options) =>
        this.contract.write.depositStETH(args, options),
      decodeResult: () => this.getBondSummary(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addBondWstETH(
    props: AddBondProps,
  ): Promise<TransactionResult<AddBondResult>> {
    const { nodeOperatorId, amount, permit: _permit, ...rest } = props;

    const { hash, permit } = await this.getPermit(
      { token: TOKENS.wsteth, amount, ...rest } as any,
      _permit,
    );
    if (hash) return { hash };

    const args = [nodeOperatorId, amount, permit] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.depositWstETH(args, options),
      sendTransaction: (options) =>
        this.contract.write.depositWstETH(args, options),
      decodeResult: () => this.getBondSummary(nodeOperatorId),
    });
  }

  public async addBond(
    props: WithToken<AddBondProps>,
  ): Promise<TransactionResult<AddBondResult>> {
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

  @Logger('Call:')
  @ErrorHandler()
  public async coverLockedBond(
    props: CoverLockedBondProps,
  ): Promise<TransactionResult<bigint>> {
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
      decodeResult: (receipt) => this.coverReceiptParseEvents(receipt),
    });
  }

  @Logger('Utils:')
  private async coverReceiptParseEvents(
    receipt: TransactionReceipt,
  ): Promise<bigint> {
    for (const log of receipt.logs) {
      // skips non-relevant events
      if (log.topics[0] !== BOND_LOCK_CHANGED_SIGNATURE) continue;
      const parsedLog = decodeEventLog({
        abi: [BOND_LOCK_CHANGED_EVENT],
        strict: true,
        ...log,
      });
      return parsedLog.args.newAmount;
    }
    throw new SDKError({
      message: 'could not find BondLockChanged event in transaction',
      code: ERROR_CODE.TRANSACTION_ERROR,
    });
  }

  public parseClaimProps<T>(props: T & Partial<RewardProof>): T & RewardProof {
    return { ...props, proof: props.proof ?? [], shares: props.shares ?? 0n };
  }

  @Logger('Call:')
  @ErrorHandler()
  public async pullRewards(
    props: PullRewardsProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, shares, proof, ...rest } =
      this.parseClaimProps(props);

    const args = [nodeOperatorId, shares, proof] as const;

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
    const { nodeOperatorId, amount, shares, proof, ...rest } =
      this.parseClaimProps(props);

    const args = [nodeOperatorId, amount, shares, proof] as const;

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
    const { nodeOperatorId, amount, shares, proof, ...rest } =
      this.parseClaimProps(props);

    const args = [nodeOperatorId, amount, shares, proof] as const;

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
    const { nodeOperatorId, amount, shares, proof, ...rest } =
      this.parseClaimProps(props);

    const args = [nodeOperatorId, amount, shares, proof] as const;

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
