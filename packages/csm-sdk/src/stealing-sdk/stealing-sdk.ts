import { TransactionResult } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { EventsSDK } from '../events-sdk/events-sdk.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { CancelProps, OperatorWithLockedBond, ReportProps } from './types.js';

export class StealingSDK extends CsmSDKModule<{
  events: EventsSDK;
  operator: OperatorSDK;
}> {
  private get moduleContract() {
    return this.core.contractCSModule;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async report(props: ReportProps): Promise<TransactionResult> {
    const { nodeOperatorId, blockHash, amount, ...rest } = props;

    const args = [nodeOperatorId, blockHash, amount] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.moduleContract.estimateGas.reportELRewardsStealingPenalty(args, options),
      sendTransaction: (options) =>
        this.moduleContract.write.reportELRewardsStealingPenalty(args, options),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async cancel(props: CancelProps): Promise<TransactionResult> {
    const { nodeOperatorId, amount, ...rest } = props;

    const args = [nodeOperatorId, amount] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.moduleContract.estimateGas.cancelELRewardsStealingPenalty(args, options),
      sendTransaction: (options) =>
        this.moduleContract.write.cancelELRewardsStealingPenalty(args, options),
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(1000 * 60 * 60)
  private async getReportRole(): Promise<Address> {
    return this.moduleContract.read.REPORT_EL_REWARDS_STEALING_PENALTY_ROLE();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async hasReportRole(address: Address): Promise<boolean> {
    const role = await this.getReportRole();
    return this.moduleContract.read.hasRole([role, address]);
  }

  // TODO: optimize loading
  @Logger('Utils:')
  public async getOperatorsWithLockedBond(): Promise<OperatorWithLockedBond[]> {
    const operators = await this.bus
      .getOrThrow('events')
      .getOperatorsWithPenalties();

    return await Promise.all(
      operators.map((nodeOperatorId) =>
        this.bus
          .getOrThrow('operator')
          .getLockedBond(nodeOperatorId)
          .then((locked) => ({ nodeOperatorId, locked })),
      ),
    );
  }
}
