import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import {
  Access,
  AccessLevel,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import { DiscoverySDK } from '../discovery-sdk/discovery-sdk';
import { TxSDK } from '../tx-sdk/index';
import { CancelProps, OperatorWithLockedBond, ReportProps } from './types';

export class DelayedPenaltySDK extends CsmSDKModule<{
  tx: TxSDK;
  discovery: DiscoverySDK;
}> {
  private get moduleContract() {
    return this.core.contractBaseModule;
  }

  @Access({
    level: AccessLevel.PROTOCOL_ROLE,
    protocolRole: 'REPORT_GENERAL_DELAYED_PENALTY_ROLE',
  })
  @Logger('Call:')
  @ErrorHandler()
  public async report(props: ReportProps) {
    const { nodeOperatorId, penaltyType, amount, details, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        this.moduleContract.encode.reportGeneralDelayedPenalty([
          nodeOperatorId,
          penaltyType,
          amount,
          details,
        ]),
    });
  }

  @Access({
    level: AccessLevel.PROTOCOL_ROLE,
    protocolRole: 'REPORT_GENERAL_DELAYED_PENALTY_ROLE',
  })
  @Logger('Call:')
  @ErrorHandler()
  public async cancel(props: CancelProps) {
    const { nodeOperatorId, amount, ...rest } = props;

    return this.bus.tx.perform({
      ...rest,
      call: () =>
        this.moduleContract.encode.cancelGeneralDelayedPenalty([
          nodeOperatorId,
          amount,
        ]),
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorsWithLockedBond(): Promise<OperatorWithLockedBond[]> {
    return this.bus.discovery.getOperatorsWithLockedBond();
  }
}
