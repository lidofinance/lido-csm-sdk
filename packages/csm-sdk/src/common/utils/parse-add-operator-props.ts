import { Address, Hex, isAddress, zeroAddress } from 'viem';
import { DepositDataKey } from '../types';
import { parseDepositData } from './parse-deposit-data';

export type AddOperatorBaseProps = {
  depositData: DepositDataKey[];
  rewardsAddress?: Address | string;
  managerAddress?: Address | string;
  extendedManagerPermissions?: boolean;
  referrer?: Address;
};

export type AddOperatorNormalized = {
  keysCount: bigint;
  publicKeys: Hex;
  signatures: Hex;
  managementProperties: {
    rewardAddress: Address;
    managerAddress: Address;
    extendedManagerPermissions: boolean;
  };
  referrer: Address;
};

const toAddressOrZero = (value?: Address | string): Address =>
  value && isAddress(value) ? value : zeroAddress;

export const parseAddOperatorProps = <T extends AddOperatorBaseProps>(
  props: T,
): Omit<T, 'rewardsAddress' | 'managerAddress' | 'extendedManagerPermissions'> &
  AddOperatorNormalized => {
  const { keysCount, publicKeys, signatures } = parseDepositData(
    props.depositData,
  );
  return {
    ...props,
    keysCount,
    publicKeys,
    signatures,
    managementProperties: {
      rewardAddress: toAddressOrZero(props.rewardsAddress),
      managerAddress: toAddressOrZero(props.managerAddress),
      extendedManagerPermissions: props.extendedManagerPermissions ?? false,
    },
    referrer: toAddressOrZero(props.referrer),
  };
};
