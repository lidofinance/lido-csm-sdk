import { isAddress, zeroAddress } from 'viem';
import { parseDepositData } from '../common/utils/index.js';
import {
  AddVettedNodeOperatorInnerProps,
  AddVettedNodeOperatorProps,
} from './types.js';

export const parseAddVettedOperatorProps = async (
  props: AddVettedNodeOperatorProps,
): Promise<AddVettedNodeOperatorInnerProps> => {
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
