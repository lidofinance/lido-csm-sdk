import { parseEther } from 'viem';
import { isBigint } from './is-bigint';

export const parseValue = (value: string | bigint): bigint => {
  if (isBigint(value)) return value;
  return parseEther(value, 'wei');
};
