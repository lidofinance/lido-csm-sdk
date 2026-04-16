import { parseDepositData } from '../common/utils/parse-deposit-data';
import { AddKeysProps } from './types';

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
