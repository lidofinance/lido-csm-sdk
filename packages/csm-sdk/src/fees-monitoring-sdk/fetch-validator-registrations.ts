import { Hex } from 'viem';
import { fetchJson } from '../common/utils/fetch-json.js';
import { API_REQUEST_TIMEOUT, DEFAULT_PAGE_LIMIT } from './constants.js';
import {
  CheckOperatorKeysProps,
  ValidatorInfo,
  ValidatorInfoIssues,
  ValidatorRegistrationResponse,
} from './types.js';

export const fetchValidatorRegistrations = async (
  baseUrl: string,
  props: CheckOperatorKeysProps,
): Promise<ValidatorInfo[]> => {
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

  const url = `${baseUrl}/v1/relays/validators-registration?${params}`;

  const data = await fetchJson<ValidatorRegistrationResponse>(url, {
    method: 'GET',
    signal: AbortSignal.timeout(API_REQUEST_TIMEOUT),
  });

  return extractValidators(data);
};

const extractValidators = (
  registrations: ValidatorRegistrationResponse,
): ValidatorInfo[] => {
  return Object.entries(registrations).map(([pubkey, reg]) => ({
    pubkey: pubkey as Hex,
    status: reg.status,
    lastPolledAt: reg.lastPolledAt,
  }));
};

export const fetchAllValidatorRegistrations = async (
  baseUrl: string,
  props: Omit<CheckOperatorKeysProps, 'start'>,
): Promise<ValidatorInfo[]> => {
  const { limit = DEFAULT_PAGE_LIMIT, ...rest } = props;
  const allResults: ValidatorInfo[] = [];
  let start = 0;

  let hasMore = true;
  while (hasMore) {
    const page = await fetchValidatorRegistrations(baseUrl, {
      ...rest,
      limit,
      start,
    });

    allResults.push(...page);

    if (page.length < limit) {
      hasMore = false;
    } else {
      start += limit;
    }
  }

  return allResults;
};

export const isValidatorWithIssue = (
  validator: ValidatorInfo,
): validator is ValidatorInfoIssues => {
  return (
    validator.status === 'NoRegistration' ||
    validator.status === 'InvalidFeeRecipient'
  );
};
