import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  EstimateView,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import { DiscoverySDK } from '../discovery-sdk/discovery-sdk';
import { TxSDK } from '../tx-sdk/index';
import { PerformOptionsNoSpend } from '../tx-sdk/types';
import { CancelProps, OperatorWithLockedBond, ReportProps } from './types';

export class DelayedPenaltySDK extends CsmSDKModule<{
  tx: TxSDK;
  discovery: DiscoverySDK;
}> {
  private get moduleContract() {
    return this.core.contractBaseModule;
  }

  private buildReport(props: ReportProps): PerformOptionsNoSpend {
    const { nodeOperatorId, penaltyType, amount, details, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.reportGeneralDelayedPenalty([
          nodeOperatorId,
          penaltyType,
          amount,
          details,
        ]),
    };
  }

  private buildCancel(props: CancelProps): PerformOptionsNoSpend {
    const { nodeOperatorId, amount, ...rest } = props;

    return {
      ...rest,
      call: () =>
        this.moduleContract.encode.cancelGeneralDelayedPenalty([
          nodeOperatorId,
          amount,
        ]),
    };
  }

  @Access({
    level: AccessLevel.PROTOCOL_ROLE,
    protocolRole: 'REPORT_GENERAL_DELAYED_PENALTY_ROLE',
  })
  @Logger('Call:')
  @ErrorHandler()
  public async report(props: ReportProps) {
    return this.bus.tx.perform(this.buildReport(props));
  }

  @EstimateView()
  public async estimateReport(props: ReportProps) {
    return this.bus.tx.estimate(this.buildReport(props));
  }

  @Access({
    level: AccessLevel.PROTOCOL_ROLE,
    protocolRole: 'REPORT_GENERAL_DELAYED_PENALTY_ROLE',
  })
  @Logger('Call:')
  @ErrorHandler()
  public async cancel(props: CancelProps) {
    return this.bus.tx.perform(this.buildCancel(props));
  }

  @EstimateView()
  public async estimateCancel(props: CancelProps) {
    return this.bus.tx.estimate(this.buildCancel(props));
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorsWithLockedBond(): Promise<OperatorWithLockedBond[]> {
    return this.bus.discovery.getOperatorsWithLockedBond();
  }
}
