import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index';
import {
  CACHE_MID,
  ERROR_CODE,
  invariant,
  NodeOperatorId,
} from '../common/index';
import {
  fetchAllValidatorRegistrations,
  isValidatorWithIssue,
} from './fetch-validator-registrations';
import { ValidatorInfoIssues } from './types';

export class FeesMonitoringSDK extends CsmSDKModule {
  @Logger('Call:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getKeysWithIssues(
    nodeOperatorId: NodeOperatorId,
  ): Promise<ValidatorInfoIssues[]> {
    const baseUrl = this.core.feesMonitoringApiLink;

    invariant(
      baseUrl,
      'Fee monitoring API URL is not configured for this network',
      ERROR_CODE.NOT_SUPPORTED,
    );

    const registrations = await fetchAllValidatorRegistrations(baseUrl, {
      moduleId: this.core.moduleId,
      nodeOperatorId,
      withIssuesOnly: true,
    });

    return registrations.filter(isValidatorWithIssue);
  }
}
