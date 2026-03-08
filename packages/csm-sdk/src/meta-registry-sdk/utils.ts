import { hexToBigInt, hexToNumber, size, slice } from 'viem';

import {
  DecodedExternalOperator,
  ExternalOperatorNOR,
  RawExternalOperator,
} from './types.js';

const NOR_TYPE = 0;
const NOR_ENTRY_LEN = 10; // 1 + 1 + 8 bytes

export const decodeExternalOperatorNOR = (
  op: RawExternalOperator,
): ExternalOperatorNOR => {
  if (size(op.data) !== NOR_ENTRY_LEN) {
    throw new Error(
      `Invalid NOR external operator data length: expected ${NOR_ENTRY_LEN}, got ${size(op.data)}`,
    );
  }

  const typeByte = hexToNumber(slice(op.data, 0, 1));
  if (typeByte !== NOR_TYPE) {
    throw new Error(
      `Invalid external operator type: expected ${NOR_TYPE}, got ${typeByte}`,
    );
  }

  const moduleId = hexToBigInt(slice(op.data, 1, 2));
  const nodeOperatorId = hexToBigInt(slice(op.data, 2, 10));

  return { moduleId, nodeOperatorId };
};

export const decodeExternalOperator = (
  op: RawExternalOperator,
): DecodedExternalOperator => {
  if (size(op.data) === NOR_ENTRY_LEN) {
    const typeByte = hexToNumber(slice(op.data, 0, 1));
    if (typeByte === NOR_TYPE) {
      return { type: 'NOR', ...decodeExternalOperatorNOR(op) };
    }
  }
  return { type: 'unknown', data: op.data };
};
