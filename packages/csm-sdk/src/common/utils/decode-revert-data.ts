import type {
  AbiParametersToPrimitiveTypes,
  ExtractAbiError,
  ExtractAbiErrorNames,
} from 'abitype';
import { type Abi, type Hex, decodeErrorResult } from 'viem';
import { CONTRACT_BASE_ABI } from '../constants/contract-abi';

type ContractAbis = (typeof CONTRACT_BASE_ABI)[keyof typeof CONTRACT_BASE_ABI];

export type ContractErrorName = ExtractAbiErrorNames<ContractAbis>;

type ArgsOf<Name extends ContractErrorName> = AbiParametersToPrimitiveTypes<
  ExtractAbiError<ContractAbis, Name>['inputs']
>;

// Discriminated union: narrowing on `name` types the `args` tuple too.
// `if (e.decodedRevert?.name === 'AccessControlUnauthorizedAccount') {
//    const [account, role] = e.decodedRevert.args; // typed }`
export type DecodedRevert = {
  [K in ContractErrorName]: { name: K; args: ArgsOf<K> };
}[ContractErrorName];

const HEX_DATA_RE = /(?:custom error |reason: )(0x[0-9a-fA-F]{8,})/;

const combinedErrorAbi: Abi = (() => {
  const seen = new Set<string>();
  const errors: Abi[number][] = [];
  for (const abi of Object.values(CONTRACT_BASE_ABI)) {
    for (const item of abi) {
      if (item.type !== 'error' || seen.has(item.name)) continue;
      seen.add(item.name);
      errors.push(item);
    }
  }
  return errors as Abi;
})();

const tryHex = (value: unknown): Hex | undefined =>
  typeof value === 'string' && value.startsWith('0x')
    ? (value as Hex)
    : undefined;

const tryHexFromString = (value: unknown): Hex | undefined => {
  if (typeof value !== 'string') return undefined;
  const match = HEX_DATA_RE.exec(value);
  return match ? (match[1] as Hex) : undefined;
};

const extractFromNode = (node: Record<string, unknown>): Hex | undefined => {
  const fromRaw = tryHex(node.raw);
  if (fromRaw) return fromRaw;

  const direct = tryHex(node.data);
  if (direct) return direct;

  if (typeof node.data === 'object' && node.data !== null) {
    const nested = tryHex((node.data as { data?: unknown }).data);
    if (nested) return nested;
  }

  return tryHexFromString(node.details) ?? tryHexFromString(node.shortMessage);
};

const extractErrorData = (error: unknown): Hex | undefined => {
  let current: unknown = error;
  while (typeof current === 'object' && current !== null) {
    const hex = extractFromNode(current as Record<string, unknown>);
    if (hex) return hex;
    current = (current as Record<string, unknown>).cause;
  }
  return undefined;
};

export const decodeRevertData = (error: unknown): DecodedRevert | undefined => {
  const data = extractErrorData(error);
  if (!data || data === '0x') return undefined;

  try {
    const decoded = decodeErrorResult({ abi: combinedErrorAbi, data });
    return {
      name: decoded.errorName,
      args: decoded.args ?? [],
    } as DecodedRevert;
  } catch {
    return undefined;
  }
};
