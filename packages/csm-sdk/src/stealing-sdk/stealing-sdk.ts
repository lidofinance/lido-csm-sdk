import { Address } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { EventsSDK } from '../events-sdk/events-sdk.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { CancelProps, OperatorWithLockedBond, ReportProps } from './types.js';

export class StealingSDK extends CsmSDKModule {
  private declare tx: TxSDK;
  private declare events: EventsSDK;
  private declare operator: OperatorSDK;

  private get moduleContract() {
    return this.core.contractCSModule;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async report(props: ReportProps) {
    const { nodeOperatorId, blockHash, amount, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'reportELRewardsStealingPenalty', [
          nodeOperatorId,
          blockHash,
          amount,
        ]),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async cancel(props: CancelProps) {
    const { nodeOperatorId, amount, ...rest } = props;

    return this.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'cancelELRewardsStealingPenalty', [
          nodeOperatorId,
          amount,
        ]),
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
    const operators = await this.events.getOperatorsWithPenalties();

    return await Promise.all(
      operators.map((nodeOperatorId) =>
        this.operator
          .getLockedBond(nodeOperatorId)
          .then((locked) => ({ nodeOperatorId, locked })),
      ),
    );
  }
}
