import { PermitSignatureShort } from '../common/types.js';

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
