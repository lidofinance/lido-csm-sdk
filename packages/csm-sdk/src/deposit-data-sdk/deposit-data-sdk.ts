import { Hex } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CSM_CONTRACT_NAMES } from '../common/index.js';
import { compareLowercase, toHexString } from '../common/utils/index.js';
import { KeysCacheSDK } from '../keys-cache-sdk/keys-cache-sdk.js';
import { KeysWithStatusSDK } from '../keys-with-status-sdk/keys-with-status-sdk.js';
import { parseDepositData, removeKey } from './parser.js';
import {
  DepositData,
  ParseResult,
  RemoveKeyResult,
  ValidationError,
  ValidationErrorCode,
} from './types.js';
import { validateDepositData, validateDepositDataSync } from './validator.js';

export class DepositDataSDK extends CsmSDKModule<{
  keysWithStatus?: KeysWithStatusSDK;
  keysCache?: KeysCacheSDK;
}> {
  /**
   * Parse deposit data JSON with enhanced error handling
   */
  @Logger('Utils:')
  public parseDepositData(json: string): ParseResult {
    return parseDepositData(json);
  }

  /**
   * Remove key at specified index with comprehensive validation
   */
  @Logger('Utils:')
  public removeKey(json: string, index: number): RemoveKeyResult {
    return removeKey(json, index);
  }

  /**
   * Validation of deposit data including signature verification
   */
  @Logger('Utils:')
  public async validateDepositData(
    depositData: DepositData[],
  ): Promise<ValidationError[]> {
    const chainId = this.core.chainId;
    const wc = this.core.getContractAddress(CSM_CONTRACT_NAMES.withdrawalVault);
    const blockNumber = await this.core.publicClient.getBlockNumber();

    const errors = await validateDepositData(depositData, {
      chainId,
      withdrawalCredentials: wc,
      currentBlockNumber: Number(blockNumber),
    });

    // Extract pubkeys for additional checks
    const pubkeys = depositData.map((data) => data.pubkey);

    // Check for cached duplicates
    const duplicateErrors = this.checkCachedKeys(pubkeys);

    // Check for previously uploaded keys
    const uploadedDuplicateErrors = await this.checkUploadedKeys(
      pubkeys.map(toHexString),
    );

    // Merge all errors
    return [...errors, ...duplicateErrors, ...uploadedDuplicateErrors];
  }

  /**
   * Quick synchronous validation without signature verification
   */
  @Logger('Utils:')
  public validateDepositDataSync(
    depositData: DepositData[],
  ): ValidationError[] {
    const chainId = this.core.chainId;
    const wc = this.core.getContractAddress(CSM_CONTRACT_NAMES.withdrawalVault);

    return validateDepositDataSync(depositData, {
      chainId,
      withdrawalCredentials: wc,
    });
  }

  @Logger('API:')
  @ErrorHandler()
  @Cache(60 * 1000)
  public async checkUploadedKeys(pubkeys: Hex[]): Promise<ValidationError[]> {
    const keys = await this.bus.keysWithStatus?.getApiKeys(pubkeys);
    const errors: ValidationError[] = [];

    if (!keys) return errors;

    pubkeys.forEach((pubkey, index) => {
      const isUploaded = keys.find((key) => compareLowercase(key.key, pubkey));

      if (isUploaded) {
        errors.push({
          index,
          message: `pubkey was previously submitted`,
          field: 'pubkey',
          code: ValidationErrorCode.PREVIOUSLY_SUBMITTED,
        });
      }
    });

    return errors;
  }

  @Logger('Utils:')
  @ErrorHandler()
  public checkCachedKeys(pubkeys: string[]): ValidationError[] {
    const keysCache = this.bus.keysCache;
    const errors: ValidationError[] = [];

    if (!keysCache) return errors;

    pubkeys.forEach((pubkey, index) => {
      if (keysCache.isDuplicate(pubkey)) {
        errors.push({
          index,
          message: `pubkey already exists in cache`,
          field: 'pubkey',
          code: ValidationErrorCode.DUPLICATE_PUBKEY,
        });
      }
    });

    return errors;
  }
}
