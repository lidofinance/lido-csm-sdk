import { isAddress, zeroAddress } from 'viem';
import { parseDepositData } from '../common/utils/index.js';
import { AddNodeOperatorInnerProps, AddNodeOperatorProps } from './types.js';

export const parseAddOperatorProps = async (
  props: AddNodeOperatorProps,
): Promise<AddNodeOperatorInnerProps> => {
  const { keysCount, publicKeys, signatures } = parseDepositData(
    props.depositData,
  );
  return {
    ...props,
    keysCount,
    publicKeys,
    signatures,
    managementProperties: {
      rewardAddress:
        props.rewardsAddress && isAddress(props.rewardsAddress)
          ? props.rewardsAddress
          : zeroAddress,
      managerAddress:
        props.managerAddress && isAddress(props.managerAddress)
          ? props.managerAddress
          : zeroAddress,
      extendedManagerPermissions: props.extendedManagerPermissions ?? false,
    },
    referrer:
      props.referrer && isAddress(props.referrer)
        ? props.referrer
        : zeroAddress,
  };
};
