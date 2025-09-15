import { ERROR_CODE, invariant } from '@lidofinance/lido-ethereum-sdk';
import { Hex } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache } from '../common/decorators/cache.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import { CSM_CONTRACT_NAMES, NodeOperatorId } from '../common/index.js';
import { FeeMonitoringApiClient } from './api-client.js';
import { RELAY_CACHE_DURATION } from './constants.js';
import {
  CheckOperatorKeysProps,
  FeeRecipientIssue,
  OperatorKeysProps,
  RelayInfo,
  ValidatorRegistration,
  ValidatorRegistrationResponse,
} from './types.js';
import {
  extractFeeRecipientIssues,
  getRequiredRelays,
  validateFeeRecipient as validateFeeRecipientAddress,
} from './validators.js';

/**
 * Fee Recipient Validation SDK Module
 *
 * This module provides functionality to validate validator keys' fee recipient configuration
 * by checking against relay registration data. It helps operators identify and fix
 * misconfigured validators.
 */
export class FeeRecipientSDK extends CsmSDKModule {
  private apiClient: FeeMonitoringApiClient | null = null;

  /**
   * Get the API client instance
   */
  @Cache(1000 * 60)
  private getApiClient(): FeeMonitoringApiClient {
    if (!this.apiClient) {
      const baseUrl = this.core.feeMonitoringApiLink;

      invariant(
        baseUrl,
        'Fee monitoring API URL is not configured for this network',
        ERROR_CODE.NOT_SUPPORTED,
      );

      this.apiClient = new FeeMonitoringApiClient(baseUrl);
    }

    return this.apiClient;
  }

  /**
   * Get list of all relays with their status and configuration
   *
   * @returns Promise resolving to array of relay information
   */
  @Logger('Call:')
  @ErrorHandler()
  @Cache(RELAY_CACHE_DURATION)
  public async getRelays(): Promise<RelayInfo[]> {
    const apiClient = this.getApiClient();
    return apiClient.getRelays();
  }

  /**
   * Check validator registrations for all keys of a specific operator
   *
   * @param props - Configuration for operator key checking
   * @returns Promise resolving to validator registration data by pubkey
   */
  @Logger('Call:')
  @ErrorHandler()
  public async checkOperatorKeys(
    props: OperatorKeysProps,
  ): Promise<ValidatorRegistrationResponse> {
    const apiClient = this.getApiClient();
    return apiClient.checkOperatorKeys({
      moduleId: this.core.moduleId,
      ...props,
    });
  }

  /**
   * Check validator registrations for specific validator pubkeys
   *
   * @param props - Configuration including pubkeys to check
   * @returns Promise resolving to validator registration data by pubkey
   */
  @Logger('Call:')
  @ErrorHandler()
  public async checkKeys(
    pubkeys: Hex[],
  ): Promise<ValidatorRegistrationResponse> {
    invariant(
      pubkeys.length > 0,
      'At least one pubkey must be provided',
      ERROR_CODE.INVALID_ARGUMENT,
    );

    invariant(
      pubkeys.length <= 1000,
      'Maximum 1000 pubkeys can be checked at once',
      ERROR_CODE.INVALID_ARGUMENT,
    );

    const apiClient = this.getApiClient();
    return apiClient.checkKeys({
      moduleId: this.core.moduleId,
      pubkeys,
    });
  }

  /**
   * Get detailed registration information for a specific validator
   *
   * @param pubkey - Validator public key
   * @returns Promise resolving to detailed registration data
   */
  @Logger('Call:')
  @ErrorHandler()
  public async getRegistrationDetails(
    pubkey: Hex,
  ): Promise<ValidatorRegistration> {
    const result = await this.checkKeys([pubkey]);

    const registration = result[pubkey];

    invariant(
      registration,
      `No registration data found for pubkey ${pubkey}`,
      ERROR_CODE.READ_ERROR,
    );

    return registration;
  }

  /**
   * Get only validators with fee recipient issues for an operator
   *
   * @param props - Configuration for operator key checking with issues filter
   * @returns Promise resolving to array of fee recipient issues
   */
  @Logger('Call:')
  @ErrorHandler()
  public async getKeysWithIssues(
    props: CheckOperatorKeysProps,
  ): Promise<FeeRecipientIssue[]> {
    // Force withIssuesOnly to true for this method
    const registrations = await this.checkOperatorKeys({
      ...props,
      withIssuesOnly: true,
    });

    return extractFeeRecipientIssues(registrations, this.core);
  }

  /**
   * Validate fee recipient address for the current network
   *
   * @param feeRecipient - Fee recipient address to validate
   * @returns Boolean indicating if the fee recipient is valid for this network
   */
  @Logger('Utils:')
  @ErrorHandler()
  public validateFeeRecipient(feeRecipient: string): boolean {
    return validateFeeRecipientAddress(feeRecipient, this.core);
  }

  /**
   * Get the expected fee recipient address for the current network
   *
   * @returns The expected fee recipient address
   */
  @Logger('Utils:')
  @ErrorHandler()
  public getExpectedFeeRecipient(): string {
    return this.core.getContractAddress(CSM_CONTRACT_NAMES.lidoRewardsVault);
  }

  /**
   * Get only required relays that validators must register with
   *
   * @returns Promise resolving to array of required relay information
   */
  @Logger('Call:')
  @ErrorHandler()
  public async getRequiredRelays(): Promise<RelayInfo[]> {
    const allRelays = await this.getRelays();
    return getRequiredRelays(allRelays);
  }
}
