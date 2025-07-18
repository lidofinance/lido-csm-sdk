import { DepositData, DepositDataErrors } from '../types.js';
import { appendError } from './append-error.js';

export const checkDuplicates = (
  depositData: DepositData[],
  errors: DepositDataErrors,
) => {
  depositData.forEach((data, index) => {
    const count = depositData.reduce(
      (count, { pubkey }) => (data.pubkey === pubkey ? count + 1 : count),
      0,
    );

    if (count > 1) {
      appendError(errors, index, `pubkey is duplicated in deposit data`);
    }
  });
};
