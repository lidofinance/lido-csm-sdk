import { PermitSignatureShort } from '../types.js';

// TODO: move to tx-sdk package
export const stripPermit = ({
  v,
  r,
  s,
  value,
  deadline,
}: PermitSignatureShort): PermitSignatureShort => ({
  v,
  r,
  s,
  value,
  deadline,
});
