import { PermitSignatureShort } from '../common/types';

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
