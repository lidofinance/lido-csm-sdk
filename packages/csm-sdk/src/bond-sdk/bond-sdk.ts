import { ERROR_CODE, SDKError } from '@lidofinance/lido-ethereum-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { NodeOperatorId, TOKENS, WithToken } from '../common/index.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { parseClaimProps } from './parse-claim-props.js';
import { parseCoverReceiptEvents } from './parse-cover-receipt-events.js';
import {
  AddBondProps,
  AddBondResult,
  ClaimBondProps,
  CoverLockedBondProps,
  PullRewardsProps,
} from './types.js';

export class BondSDK extends CsmSDKModule {
  private declare tx: TxSDK;

  private get accountingContract() {
    return this.core.contractCSAccounting;
  }

  private get moduleContract() {
    return this.core.contractCSModule;
  }

  @Logger('Views:')
  @ErrorHandler()
  private async getBondSummary(id: NodeOperatorId): Promise<AddBondResult> {
    const [current, required] =
      await this.accountingContract.read.getBondSummary([id]);
    return { current, required };
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addBondETH(props: AddBondProps) {
    const { nodeOperatorId, amount, permit, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.accountingContract,
          'depositETH',
          [nodeOperatorId],
          amount,
        ),
      decodeResult: () => this.getBondSummary(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addBondStETH(props: AddBondProps) {
    const { nodeOperatorId, amount, permit, ...rest } = props;

    return this.tx.perform({
      ...rest,
      spend: { token: TOKENS.steth, amount, permit },
      call: ({ permit }) =>
        prepCall(this.accountingContract, 'depositStETH', [
          nodeOperatorId,
          amount,
          permit,
        ]),
      decodeResult: () => this.getBondSummary(nodeOperatorId),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addBondWstETH(props: AddBondProps) {
    const { nodeOperatorId, amount, permit, ...rest } = props;

    return this.tx.perform({
      ...rest,
      spend: { token: TOKENS.wsteth, amount, permit },
      call: ({ permit }) =>
        prepCall(this.accountingContract, 'depositWstETH', [
          nodeOperatorId,
          amount,
          permit,
        ]),
      decodeResult: () => this.getBondSummary(nodeOperatorId),
    });
  }

  public async addBond(props: WithToken<AddBondProps>) {
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

  @Logger('Call:')
  @ErrorHandler()
  public async coverLockedBond(props: CoverLockedBondProps) {
    const { nodeOperatorId, amount, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(
          this.moduleContract,
          'compensateELRewardsStealingPenalty',
          [nodeOperatorId],
          amount,
        ),
      decodeResult: (receipt) => parseCoverReceiptEvents(receipt),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async pullRewards(props: PullRewardsProps) {
    const { nodeOperatorId, shares, proof, ...rest } = parseClaimProps(props);

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.accountingContract, 'pullFeeRewards', [
          nodeOperatorId,
          shares,
          proof,
        ]),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async claimBondUnstETH(props: ClaimBondProps) {
    const { nodeOperatorId, amount, shares, proof, ...rest } =
      parseClaimProps(props);

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.accountingContract, 'claimRewardsUnstETH', [
          nodeOperatorId,
          amount,
          shares,
          proof,
        ]),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async claimBondStETH(props: ClaimBondProps) {
    const { nodeOperatorId, amount, shares, proof, ...rest } =
      parseClaimProps(props);

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.accountingContract, 'claimRewardsStETH', [
          nodeOperatorId,
          amount,
          shares,
          proof,
        ]),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async claimBondWstETH(props: ClaimBondProps) {
    const { nodeOperatorId, amount, shares, proof, ...rest } =
      parseClaimProps(props);

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.accountingContract, 'claimRewardsWstETH', [
          nodeOperatorId,
          amount,
          shares,
          proof,
        ]),
    });
  }

  public async claimBond(props: WithToken<ClaimBondProps>) {
    const { token, amount } = props;

    switch (true) {
      case amount === 0n:
        return this.pullRewards(props);
      case token === TOKENS.eth:
        return this.claimBondUnstETH(props);
      case token === TOKENS.steth:
        return this.claimBondStETH(props);
      case token === TOKENS.wsteth:
        return this.claimBondWstETH(props);
      default:
        throw new SDKError({
          message: 'unsupported token',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }
}
