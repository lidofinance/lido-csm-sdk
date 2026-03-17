import { type Abi, type Hex, decodeErrorResult } from 'viem';
import { CONTRACT_BASE_ABI } from '../constants/contract-abi.js';

const HEX_DATA_RE = /(?:custom error |reason: )(0x[0-9a-fA-F]{8,})/;

let combinedErrorAbi: Abi | null = null;

const getCombinedErrorAbi = (): Abi => {
  if (combinedErrorAbi) return combinedErrorAbi;

  const seen = new Set<string>();
  const errors: Abi[number][] = [];

  for (const abi of Object.values(CONTRACT_BASE_ABI)) {
    for (const item of abi) {
      if (item.type !== 'error') continue;
      if (seen.has(item.name)) continue;
      seen.add(item.name);
      errors.push(item);
    }
  }

  combinedErrorAbi = errors as Abi;
  return combinedErrorAbi;
};

const tryExtractHex = (value: unknown): Hex | undefined => {
  if (typeof value === 'string' && value.startsWith('0x')) {
    return value as Hex;
  }
  return undefined;
};

const extractFromNode = (err: unknown): Hex | undefined => {
  if (typeof err !== 'object' || err === null) return undefined;

  // prettier-ignore
  if ('raw' in err && typeof err.raw === 'string' && err.raw.startsWith('0x')) {
    return err.raw as Hex;
  }

  if ('data' in err) {
    const d = (err as { data: unknown }).data;
    const direct = tryExtractHex(d);
    if (direct) return direct;

    if (typeof d === 'object' && d !== null && 'data' in d) {
      return tryExtractHex((d as { data: unknown }).data);
    }
  }

  return undefined;
};

const extractHexFromString = (value: unknown): Hex | undefined => {
  if (typeof value !== 'string') return undefined;
  const match = HEX_DATA_RE.exec(value);
  return match ? (match[1] as Hex) : undefined;
};

const extractHexFromNode = (node: Record<string, unknown>): Hex | undefined =>
  extractFromNode(node) ??
  extractHexFromString(node.details) ??
  extractHexFromString(node.shortMessage);

const extractErrorData = (error: unknown): Hex | undefined => {
  let current: unknown = error;

  while (typeof current === 'object' && current !== null) {
    const hex = extractHexFromNode(current as Record<string, unknown>);
    if (hex) return hex;
    current = (current as Record<string, unknown>).cause;
  }

  return undefined;
};

export const decodeRevertData = (error: unknown): string | undefined => {
  const data = extractErrorData(error);
  if (!data || data === '0x') return undefined;

  try {
    const decoded = decodeErrorResult({ abi: getCombinedErrorAbi(), data });
    const args = decoded.args?.length
      ? `(${decoded.args.map(String).join(', ')})`
      : '';
    return `${decoded.errorName}${args}`;
  } catch {
    return undefined;
  }
};
