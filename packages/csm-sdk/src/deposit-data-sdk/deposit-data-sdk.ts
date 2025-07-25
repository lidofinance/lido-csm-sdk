import { Hex } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CSM_CONTRACT_NAMES } from '../common/index.js';
import { compareLowercase } from '../common/utils/compare-lowercase.js';
import { KeysWithStatusSDK } from '../keys-with-status-sdk/keys-with-status-sdk.js';
import { parseDepositData } from './parse/parse-deposit-data.js';
import { removeKey } from './parse/remove-key.js';
import { DepositData, DepositDataErrors } from './types.js';
import { appendError } from './validate/append-error.js';
import { checkDuplicates } from './validate/check-duplicates.js';
import { checkItem } from './validate/check-item.js';
import { checkPreviouslySubmittedDuplicates } from './validate/check-previously-submitted-duplicates.js';
import { hasErrors } from './validate/has-errors.js';

export class DepositDataSDK extends CsmSDKModule<{
  keysWithStatus: KeysWithStatusSDK;
}> {
  @Logger('Utils:')
  public parse(json: string) {
    return parseDepositData(json);
  }

  @Logger('Utils:')
  public removeKey(json: string, index: number) {
    return removeKey(json, index);
  }

  @Logger('Utils:')
  public async validate(depositData: DepositData[]) {
    const chainId = this.core.chainId;
    const wc = this.core.getContractAddress(CSM_CONTRACT_NAMES.withdrawalVault);
    const errors: DepositDataErrors = Array.from(
      { length: depositData.length },
      () => [],
    );

    depositData.forEach((data, index) => {
      const error = checkItem(data, chainId, wc);
      appendError(errors, index, error);
    });
    checkDuplicates(depositData, errors);

    if (!hasErrors(errors)) {
      const blockNumber = await this.core.client.getBlockNumber();
      checkPreviouslySubmittedDuplicates(
        depositData,
        chainId,
        Number(blockNumber),
        errors,
      );
    }

    // if (hasErrors(depositData)) {
    //   return depositData;
    // }
    // await checkUploadedKeys(depositData);
    return errors;
  }

  @Logger('API:')
  @ErrorHandler()
  @Cache(60 * 1000)
  public async checkUploadedKeys(pubkeys: Hex[]): Promise<Hex[] | null> {
    const keys = await this.bus.get('keysWithStatus')?.getApiKeys(pubkeys);
    if (!keys) return null;

    return pubkeys.filter((pubkey) =>
      // TODO: check comparing is valid
      keys.find((key) => compareLowercase(key.key, pubkey)),
    );
  }
}
