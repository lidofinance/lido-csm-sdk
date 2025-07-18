import { CSM_SUPPORTED_CHAINS } from '../../common/index.js';
import { checkKeys } from '../cached-keys/index.js';
import { DepositData, DepositDataErrors } from '../types.js';
import { appendError } from './append-error.js';

export const checkPreviouslySubmittedDuplicates = (
  depositData: DepositData[],
  chainId: CSM_SUPPORTED_CHAINS,
  blockNumber: number,
  errors: DepositDataErrors,
) => {
  const keys = depositData.map(({ pubkey }) => pubkey);
  const duplicates = checkKeys(keys, chainId, blockNumber);

  depositData.forEach((data, index) => {
    if (duplicates.includes(data.pubkey)) {
      appendError(errors, index, `pubkey was previously submitted`);
    }
  });
};
