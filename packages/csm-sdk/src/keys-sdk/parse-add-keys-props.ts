import { parseDepositData } from '../common/utils/parse-deposit-data.js';
import { AddKeysProps } from './types.js';

export const parseAddKeysProps = async (props: AddKeysProps) => {
  const { keysCount, publicKeys, signatures } = parseDepositData(
    props.depositData,
  );
  return {
    ...props,
    keysCount,
    publicKeys,
    signatures,
  };
};
