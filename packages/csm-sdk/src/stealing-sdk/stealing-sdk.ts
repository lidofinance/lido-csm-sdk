import { Address } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { CACHE_LONG } from '../common/constants/index.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { EventsSDK } from '../events-sdk/events-sdk.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { prepCall, TxSDK } from '../tx-sdk/index.js';
import { CancelProps, OperatorWithLockedBond, ReportProps } from './types.js';

export class StealingSDK extends CsmSDKModule<{
  tx: TxSDK;
  events: EventsSDK;
  operator: OperatorSDK;
}> {
  private get moduleContract() {
    return this.core.contractCSModule;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async report(props: ReportProps) {
    const { nodeOperatorId, penaltyType, amount, details, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'reportGeneralDelayedPenalty', [
          nodeOperatorId,
          penaltyType,
          amount,
          details,
        ]),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async cancel(props: CancelProps) {
    const { nodeOperatorId, amount, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        prepCall(this.moduleContract, 'cancelGeneralDelayedPenalty', [
          nodeOperatorId,
          amount,
        ]),
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_LONG)
  private async getReportRole(): Promise<Address> {
    return this.moduleContract.read.REPORT_GENERAL_DELAYED_PENALTY_ROLE();
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
    const operators = await this.bus.events.getOperatorsWithPenalties();

    return await Promise.all(
      operators.map((nodeOperatorId) =>
        this.bus.operator
          .getLockedBond(nodeOperatorId)
          .then((locked) => ({ nodeOperatorId, locked })),
      ),
    );
  }
}
