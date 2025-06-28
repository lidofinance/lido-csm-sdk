import { PermitSignatureShort } from '../tyles.js';

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
