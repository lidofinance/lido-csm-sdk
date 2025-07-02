import { zeroHash } from 'viem';
import { PermitSignatureShort } from '../types.js';

export const EMPTY_PERMIT: PermitSignatureShort = {
  value: 0n,
  deadline: 0n,
  v: 0,
  r: zeroHash,
  s: zeroHash,
};
