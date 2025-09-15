import { fetchJson } from '../common/utils/fetch-json.js';
import { API_REQUEST_TIMEOUT, DEFAULT_PAGE_LIMIT } from './constants.js';
import {
  CheckKeysProps,
  CheckOperatorKeysProps,
  GetRelaysResponse,
  RelayInfo,
  ValidatorRegistrationResponse,
} from './types.js';

/**
 * API client for fee monitoring service
 */
export class FeeMonitoringApiClient {
  constructor(private readonly baseUrl: string) {}

  /**
   * Fetch list of available relays
   */
  async getRelays(): Promise<RelayInfo[]> {
    const url = `${this.baseUrl}/api/v1/relays`;

    const response = await fetchJson<GetRelaysResponse>(url, {
      method: 'GET',
      signal: AbortSignal.timeout(API_REQUEST_TIMEOUT),
    });

    return response.data;
  }

  /**
   * Check validator registrations for an operator
   */
  async checkOperatorKeys(
    props: CheckOperatorKeysProps,
  ): Promise<ValidatorRegistrationResponse> {
    const {
      moduleId,
      nodeOperatorId,
      limit = DEFAULT_PAGE_LIMIT,
      start = 0,
      withIssuesOnly = false,
    } = props;

    const params = new URLSearchParams({
      moduleId: moduleId.toString(),
      limit: limit.toString(),
      start: start.toString(),
      withIssuesOnly: withIssuesOnly.toString(),
    });

    if (nodeOperatorId !== undefined) {
      params.set('nodeOperatorId', nodeOperatorId.toString());
    }

    const url = `${this.baseUrl}/api/v1/relays/validators-registration?${params}`;

    return fetchJson<ValidatorRegistrationResponse>(url, {
      method: 'GET',
      signal: AbortSignal.timeout(API_REQUEST_TIMEOUT),
    });
  }

  /**
   * Check validator registrations for specific pubkeys
   */
  async checkKeys(props: CheckKeysProps): Promise<ValidatorRegistrationResponse> {
    const { moduleId, pubkeys } = props;

    const url = `${this.baseUrl}/api/v1/relays/validators-registration/pubkeys`;

    return fetchJson<ValidatorRegistrationResponse>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        moduleId,
        pubkeys,
      }),
      signal: AbortSignal.timeout(API_REQUEST_TIMEOUT),
    });
  }
}