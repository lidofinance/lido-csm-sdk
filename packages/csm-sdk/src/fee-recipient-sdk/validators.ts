import type { Address } from 'viem';
import { isAddressEqual } from 'viem';
import { CSM_CONTRACT_NAMES } from '../common/index.js';
import { CoreSDK } from '../core-sdk/core-sdk.js';
import {
  FeeRecipientIssue,
  RelayInfo,
  ValidatorRegistration,
  ValidatorRegistrationResponse,
} from './types.js';

/**
 * Validate fee recipient address for a specific chain
 */
export const validateFeeRecipient = (
  feeRecipient: string,
  core: CoreSDK,
): boolean => {
  const expectedFeeRecipient = core.getContractAddress(CSM_CONTRACT_NAMES.lidoRewardsVault);

  try {
    return isAddressEqual(
      feeRecipient as Address,
      expectedFeeRecipient,
    );
  } catch {
    // Invalid address format
    return false;
  }
}

/**
 * Extract fee recipient issues from validator registration data
 */
export const extractFeeRecipientIssues = (
  registrations: ValidatorRegistrationResponse,
  core: CoreSDK,
): FeeRecipientIssue[] => {
  const expectedFeeRecipient = core.getContractAddress(CSM_CONTRACT_NAMES.lidoRewardsVault);

  const issues: FeeRecipientIssue[] = [];

  for (const [pubkey, registration] of Object.entries(registrations)) {
    const issue = analyzeValidatorRegistration(
      pubkey,
      registration,
      expectedFeeRecipient,
    );
    
    if (issue) {
      issues.push(issue);
    }
  }

  return issues;
}

/**
 * Analyze a single validator registration for fee recipient issues
 */
const analyzeValidatorRegistration = (
  pubkey: string,
  registration: ValidatorRegistration,
  expectedFeeRecipient: string,
): FeeRecipientIssue | null => {
  const { status, relays } = registration;

  // Skip if registration is OK
  if (status === 'RegistrationOk') {
    return null;
  }

  // Skip if polling is still in progress
  if (status === 'PollingInProgress') {
    return null;
  }

  const relayUrls: string[] = [];
  let actualFeeRecipient: string | undefined;

  // Extract fee recipient and relay information
  for (const [relayUrl, relayData] of Object.entries(relays)) {
    relayUrls.push(relayUrl);
    
    if (relayData.polledResult?.message.fee_recipient) {
      actualFeeRecipient = relayData.polledResult.message.fee_recipient;
    }
  }

  return {
    pubkey,
    status,
    expectedFeeRecipient,
    actualFeeRecipient,
    relays: relayUrls,
  };
}

/**
 * Filter relays by type
 */
export const filterRelaysByType = (
  relays: RelayInfo[],
  type: RelayInfo['type'],
): RelayInfo[] => {
  return relays.filter((relay) => relay.type === type && !relay.removed);
}

/**
 * Get required relays only
 */
export const getRequiredRelays = (relays: RelayInfo[]): RelayInfo[] => {
  return filterRelaysByType(relays, 'REQUIRED');
}

/**
 * Check if validator has any valid registrations with required relays
 */
export const hasValidRequiredRelayRegistration = (
  registration: ValidatorRegistration,
  requiredRelays: RelayInfo[],
): boolean => {
  const requiredRelayUrls = new Set(requiredRelays.map(r => r.url));
  
  for (const [relayUrl, relayData] of Object.entries(registration.relays)) {
    if (requiredRelayUrls.has(relayUrl) && relayData.valid) {
      return true;
    }
  }
  
  return false;
}