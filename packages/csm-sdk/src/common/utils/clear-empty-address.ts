import { Address, zeroAddress } from 'viem';

export const clearEmptyAddress = (address?: Address) => {
  return address !== zeroAddress ? address : undefined;
};
