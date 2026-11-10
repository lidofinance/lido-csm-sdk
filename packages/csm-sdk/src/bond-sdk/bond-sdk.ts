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
  NodeOperatorId,
  SDKError,
  TOKENS,
  WithToken,
} from '../common/index';
import { parseClaimProps } from '../common/utils/parse-claim-props';
import { TxSDK } from '../tx-sdk/index';
import {
  PerformOptions,
  PerformOptionsNoSpend,
  PerformOptionsSpend,
} from '../tx-sdk/types';
import { parseCoverReceiptEvents } from './parse-cover-receipt-events';
import {
  AddBondProps,
  AddBondResult,
  ClaimBondProps,
  CompensateLockedBondProps,
  PullRewardsProps,
  UnlockExpiredLockProps,
} from './types';

export class BondSDK extends CsmSDKModule<{ tx: TxSDK }> {
  private get accountingContract() {
    return this.core.getContract(CONTRACT_NAMES.accounting);
  }

  private get moduleContract() {
    return this.core.contractBaseModule;
  }

  @Logger('Views:')
  @ErrorHandler()
  private async getBondSummary(id: NodeOperatorId): Promise<AddBondResult> {
    // TODO: review for CM
    const [current, required] =
      await this.accountingContract.read.getBondSummary([id]);
    return { current, required };
  }

  private buildAddBondETH(
    props: AddBondProps,
  ): PerformOptionsNoSpend<AddBondResult> {
    const { nodeOperatorId, amount, permit: _permit, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.accountingContract.encode.depositETH([nodeOperatorId], {
          value: amount,
        }),
      decodeResult: () => this.getBondSummary(nodeOperatorId),
    };
  }

  private buildAddBondStETH(
    props: AddBondProps,
  ): PerformOptionsSpend<AddBondResult> {
    const { nodeOperatorId, amount, permit, ...rest } = props;

    return {
      ...rest,
      spend: { token: TOKENS.steth, amount, permit },
      call: ({ permit }) =>
        this.accountingContract.encode.depositStETH([
          nodeOperatorId,
          amount,
          permit,
        ]),
      decodeResult: () => this.getBondSummary(nodeOperatorId),
    };
  }

  private buildAddBondWstETH(
    props: AddBondProps,
  ): PerformOptionsSpend<AddBondResult> {
    const { nodeOperatorId, amount, permit, ...rest } = props;

    return {
      ...rest,
      spend: { token: TOKENS.wsteth, amount, permit },
      call: ({ permit }) =>
        this.accountingContract.encode.depositWstETH([
          nodeOperatorId,
          amount,
          permit,
        ]),
      decodeResult: () => this.getBondSummary(nodeOperatorId),
    };
  }

  private buildAddBond(
    props: WithToken<AddBondProps>,
  ): PerformOptions<AddBondResult> {
    switch (props.token) {
      case TOKENS.eth:
        return this.buildAddBondETH(props);
      case TOKENS.steth:
        return this.buildAddBondStETH(props);
      case TOKENS.wsteth:
        return this.buildAddBondWstETH(props);
      default:
        throw new SDKError({
          message: 'unsupported token',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }

  private buildCompensateLockedBond(
    props: CompensateLockedBondProps,
  ): PerformOptionsNoSpend<bigint> {
    const { nodeOperatorId, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.compensateGeneralDelayedPenalty([
          nodeOperatorId,
        ]),
      decodeResult: (receipt) => parseCoverReceiptEvents(receipt),
    };
  }

  private buildUnlockExpiredLock(
    props: UnlockExpiredLockProps,
  ): PerformOptionsNoSpend {
    const { nodeOperatorId, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.accountingContract.encode.unlockExpiredLock([nodeOperatorId]),
    };
  }

  private buildPullRewards(props: PullRewardsProps): PerformOptionsNoSpend {
    const { nodeOperatorId, shares, proof, ...rest } = parseClaimProps(props);

    return {
      ...rest,
      call: () =>
        this.accountingContract.encode.pullAndSplitFeeRewards([
          nodeOperatorId,
          shares,
          proof,
        ]),
    };
  }

  private buildClaimBondUnstETH(props: ClaimBondProps): PerformOptionsNoSpend {
    const { nodeOperatorId, amount, shares, proof, ...rest } =
      parseClaimProps(props);

    return {
      ...rest,
      call: () =>
        this.accountingContract.encode.claimRewardsUnstETH([
          nodeOperatorId,
          amount,
          shares,
          proof,
        ]),
    };
  }

  private buildClaimBondStETH(props: ClaimBondProps): PerformOptionsNoSpend {
    const { nodeOperatorId, amount, shares, proof, ...rest } =
      parseClaimProps(props);

    return {
      ...rest,
      call: () =>
        this.accountingContract.encode.claimRewardsStETH([
          nodeOperatorId,
          amount,
          shares,
          proof,
        ]),
    };
  }

  private buildClaimBondWstETH(props: ClaimBondProps): PerformOptionsNoSpend {
    const { nodeOperatorId, amount, shares, proof, ...rest } =
      parseClaimProps(props);

    return {
      ...rest,
      call: () =>
        this.accountingContract.encode.claimRewardsWstETH([
          nodeOperatorId,
          amount,
          shares,
          proof,
        ]),
    };
  }

  private buildClaimBond(props: WithToken<ClaimBondProps>): PerformOptions {
    const { token, amount } = props;

    switch (true) {
      case amount === 0n:
        return this.buildPullRewards(props);
      case token === TOKENS.eth:
        return this.buildClaimBondUnstETH(props);
      case token === TOKENS.steth:
        return this.buildClaimBondStETH(props);
      case token === TOKENS.wsteth:
        return this.buildClaimBondWstETH(props);
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
  public async addBondETH(props: AddBondProps) {
    return this.bus.tx.perform(this.buildAddBondETH(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addBondStETH(props: AddBondProps) {
    return this.bus.tx.perform(this.buildAddBondStETH(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addBondWstETH(props: AddBondProps) {
    return this.bus.tx.perform(this.buildAddBondWstETH(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async addBond(props: WithToken<AddBondProps>) {
    return this.bus.tx.perform(this.buildAddBond(props));
  }

  @EstimateView()
  public async estimateAddBond(props: WithToken<AddBondProps>) {
    return this.bus.tx.estimate(this.buildAddBond(props));
  }

  @Access({ level: AccessLevel.MANAGER })
  @Logger('Call:')
  @ErrorHandler()
  public async compensateLockedBond(props: CompensateLockedBondProps) {
    return this.bus.tx.perform(this.buildCompensateLockedBond(props));
  }

  @EstimateView()
  public async estimateCompensateLockedBond(props: CompensateLockedBondProps) {
    return this.bus.tx.estimate(this.buildCompensateLockedBond(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async unlockExpiredLock(props: UnlockExpiredLockProps) {
    return this.bus.tx.perform(this.buildUnlockExpiredLock(props));
  }

  @EstimateView()
  public async estimateUnlockExpiredLock(props: UnlockExpiredLockProps) {
    return this.bus.tx.estimate(this.buildUnlockExpiredLock(props));
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async pullRewards(props: PullRewardsProps) {
    return this.bus.tx.perform(this.buildPullRewards(props));
  }

  @EstimateView()
  public async estimatePullRewards(props: PullRewardsProps) {
    return this.bus.tx.estimate(this.buildPullRewards(props));
  }

  @Access({ level: AccessLevel.CLAIMER })
  @Logger('Call:')
  @ErrorHandler()
  public async claimBondUnstETH(props: ClaimBondProps) {
    return this.bus.tx.perform(this.buildClaimBondUnstETH(props));
  }

  @Access({ level: AccessLevel.CLAIMER })
  @Logger('Call:')
  @ErrorHandler()
  public async claimBondStETH(props: ClaimBondProps) {
    return this.bus.tx.perform(this.buildClaimBondStETH(props));
  }

  @Access({ level: AccessLevel.CLAIMER })
  @Logger('Call:')
  @ErrorHandler()
  public async claimBondWstETH(props: ClaimBondProps) {
    return this.bus.tx.perform(this.buildClaimBondWstETH(props));
  }

  @Access({ level: AccessLevel.CLAIMER })
  @Logger('Call:')
  @ErrorHandler()
  public async claimBond(props: WithToken<ClaimBondProps>) {
    return this.bus.tx.perform(this.buildClaimBond(props));
  }

  @EstimateView()
  public async estimateClaimBond(props: WithToken<ClaimBondProps>) {
    return this.bus.tx.estimate(this.buildClaimBond(props));
  }
}
