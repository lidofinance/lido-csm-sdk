import { ERROR_CODE, invariant } from '@lidofinance/lido-ethereum-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CACHE_MID, NodeOperatorId } from '../common/index.js';
import {
  fetchValidatorRegistrations,
  isValidatorWithIssue,
} from './fetch-validator-registrations.js';
import { ValidatorInfoIssues } from './types.js';

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

    const registrations = await fetchValidatorRegistrations(baseUrl, {
      moduleId: this.core.moduleId,
      nodeOperatorId,
      withIssuesOnly: true,
    });

    return registrations.filter(isValidatorWithIssue);
  }
}
