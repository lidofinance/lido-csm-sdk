import type {
  AbiParametersToPrimitiveTypes,
  ExtractAbiError,
  ExtractAbiErrorNames,
} from 'abitype';
import { type Abi, type Hex, decodeErrorResult } from 'viem';
import { formatAbiItem, toFunctionSelector } from 'viem/utils';
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

// viem surfaces estimateGas custom-error reverts as a formatted message:
//   "custom error 0x<selector>: <abi-encoded-args-hex>"
// The args trail the selector after ": " WITHOUT a 0x prefix. Capture both and
// rejoin so errors WITH args decode — a selector alone fails decodeErrorResult
// for any error that has inputs (e.g. AccessControlUnauthorizedAccount(address,bytes32)).
// Arg-less errors and full-data "reason: 0x..." strings keep their old value
// (group 2 simply doesn't match).
const HEX_DATA_RE =
  /(?:custom error |reason: )(0x[0-9a-fA-F]+)(?::\s*([0-9a-fA-F]+))?/;

// Dedup by 4-byte selector, not by name: two ABIs may declare distinct errors
// that happen to share a name but encode different argument tuples. Dropping
// by name would silently misdecode one of them. Same-selector duplicates
// (identical signature in multiple contracts) are still collapsed silently.
// Name collisions across different selectors emit a single console.warn each
// so future ABI drift surfaces without breaking decoding.
export const buildCombinedErrorAbi = (abis: readonly Abi[]): Abi => {
  const bySelector = new Map<Hex, Abi[number]>();
  const byName = new Map<string, string>();
  const warned = new Set<string>();
  for (const abi of abis) {
    for (const item of abi) {
      if (item.type !== 'error') continue;
      const signature = formatAbiItem(item);
      const selector = toFunctionSelector(signature);
      if (bySelector.has(selector)) continue;
      bySelector.set(selector, item);
      const prevSignature = byName.get(item.name);
      if (
        prevSignature &&
        prevSignature !== signature &&
        !warned.has(item.name)
      ) {
        warned.add(item.name);

        console.warn(
          `[csm-sdk] ABI error name collision for "${item.name}": ${prevSignature} vs ${signature}`,
        );
      } else if (!prevSignature) {
        byName.set(item.name, signature);
      }
    }
  }
  return [...bySelector.values()] as Abi;
};

const combinedErrorAbi: Abi = buildCombinedErrorAbi(
  Object.values(CONTRACT_BASE_ABI),
);

const tryHex = (value: unknown): Hex | undefined =>
  typeof value === 'string' && value.startsWith('0x')
    ? (value as Hex)
    : undefined;

const tryHexFromString = (value: unknown): Hex | undefined => {
  if (typeof value !== 'string') return undefined;
  const match = HEX_DATA_RE.exec(value);
  if (!match) return undefined;
  return `${match[1]}${match[2] ?? ''}` as Hex;
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
