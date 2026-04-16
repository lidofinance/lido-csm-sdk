import { Hex } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index';
import { CACHE_MID, CONTRACT_NAMES } from '../common/index';
import {
  compareLowercase,
  isHexadecimalString,
  toHexString,
} from '../common/utils/index';
import { KeysCacheSDK } from '../keys-cache-sdk/keys-cache-sdk';
import { KeysWithStatusSDK } from '../keys-with-status-sdk/keys-with-status-sdk';
import { ModuleSDK } from '../module-sdk/module-sdk';
import { PUBKEY_LENGTH } from './constants';
import { parseDepositData, removeKey } from './parser';
import {
  DepositData,
  ParseResult,
  RemoveKeyResult,
  ValidationError,
  ValidationErrorCode,
} from './types';
import { validateDepositData } from './validator';

export class DepositDataSDK extends CsmSDKModule<{
  module: ModuleSDK;
  keysWithStatus?: KeysWithStatusSDK;
  keysCache?: KeysCacheSDK;
}> {
  @Logger('Utils:')
  public parseDepositData(json: string): ParseResult {
    return parseDepositData(json);
  }

  @Logger('Utils:')
  public removeKey(json: string, index: number): RemoveKeyResult {
    return removeKey(json, index);
  }

  @Logger('Utils:')
  private async getWcPrefix(): Promise<string> {
    const wcType = await this.bus.module.getWithdrawalCredentialsType();
    return wcType.toString(16).padStart(2, '0').padEnd(24, '0');
  }

  @Logger('Utils:')
  public async validateDepositData(
    depositData: DepositData[],
  ): Promise<ValidationError[]> {
    const chainId = this.core.chainId;
    const wc = this.core.getContractAddress(CONTRACT_NAMES.withdrawalVault);
    const [blockNumber, wcPrefix] = await Promise.all([
      this.core.publicClient.getBlockNumber(),
      this.getWcPrefix(),
    ]);

    const errors = await validateDepositData(depositData, {
      chainId,
      withdrawalCredentials: wc,
      wcPrefix,
      currentBlockNumber: Number(blockNumber),
    });

    if (errors.length) {
      return [...errors];
    }

    const pubkeys = depositData.map((data) => data.pubkey);

    const duplicateErrors = this.checkCachedKeys(pubkeys);
    const uploadedDuplicateErrors = await this.checkUploadedKeys(pubkeys);
    const clErrors = await this.checkClKeys(pubkeys.map(toHexString));

    return [
      ...errors,
      ...duplicateErrors,
      ...uploadedDuplicateErrors,
      ...clErrors,
    ];
  }

  @Logger('API:')
  @ErrorHandler()
  @Cache(CACHE_MID)
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
  public checkCachedKeys(pubkeys: Hex[]): ValidationError[] {
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

  @Logger('API:')
  @ErrorHandler()
  public async checkClKeys(pubkeys: Hex[]): Promise<ValidationError[]> {
    const validPubkeys = pubkeys.filter((p) =>
      isHexadecimalString(p, PUBKEY_LENGTH),
    );
    const clKeys = await this.bus.keysWithStatus?.getClKeys(validPubkeys);
    const errors: ValidationError[] = [];

    if (!clKeys) return errors;

    pubkeys.forEach((pubkey, index) => {
      const exists = clKeys.find((k) => compareLowercase(k.pubkey, pubkey));
      if (exists) {
        errors.push({
          index,
          message: `pubkey already exists as validator on CL`,
          field: 'pubkey',
          code: ValidationErrorCode.VALIDATOR_EXISTS,
        });
      }
    });

    return errors;
  }
}
