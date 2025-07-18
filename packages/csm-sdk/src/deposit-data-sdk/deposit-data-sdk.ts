import { Hex } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CSM_CONTRACT_NAMES } from '../common/index.js';
import { parseDepositData } from './parse/parse-deposit-data.js';
import { DepositData, DepositDataErrors } from './types.js';
import { appendError } from './validate/append-error.js';
import { checkDuplicates } from './validate/check-duplicates.js';
import { checkItem } from './validate/check-item.js';
import { checkPreviouslySubmittedDuplicates } from './validate/check-previously-submitted-duplicates.js';
import { hasErrors } from './validate/has-errors.js';
import { fetchJson } from '../common/utils/fetch-json.js';
import { FindKeysResponse } from '../keys-with-status-sdk/types.js';
import { compareLowercase } from '../common/utils/compare-lowercase.js';
import { removeKey } from './parse/remove-key.js';

export class DepositDataSDK extends CsmSDKModule {
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
    const keysApi = this.core.keysApiLink;

    if (!keysApi) {
      throw new Error('Keys API link is not configured');
    }

    const url = `${keysApi}/v1/keys/find`;

    const response = await fetchJson<FindKeysResponse>(url, {
      method: 'POST',
      body: JSON.stringify({ pubkeys }),
    }).catch(() => null);

    if (!response) return null;

    const keys = response.data;

    return pubkeys.filter((pubkey) =>
      // TODO: check comparing is valid
      keys.find((key) => compareLowercase(key.key, pubkey)),
    );
  }
}
