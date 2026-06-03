import { Address } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { CACHE_LONG } from '../common/constants/index';
import {
  Access,
  AccessLevel,
  Cache,
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

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorsWithLockedBond(): Promise<OperatorWithLockedBond[]> {
    return this.bus.discovery.getOperatorsWithLockedBond();
  }
}
