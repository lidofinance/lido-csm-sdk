import { toHexString } from '../common/utils/is-hexadecimal-string';
import { DepositData, ParseResult, RemoveKeyResult } from './types';
import { MAX_JSON_LENGTH } from './constants';

/**
 * Normalizes hex values in JSON by removing '0x' prefixes
 */
const normalizeHexInJson = (text: string): string => {
  return text.replaceAll(/"0x/gm, '"');
};

// Convert a present value to Hex, leaving falsy values untouched for the
// required-field check below to report.
const toHexIfPresent = (value: any) => (value ? toHexString(value) : value);

const requiredFields: Array<keyof DepositData> = [
  'pubkey',
  'withdrawal_credentials',
  'amount',
  'signature',
  'deposit_message_root',
  'deposit_data_root',
  'fork_version',
  'network_name',
];

/**
 * Validates and parses JSON string into DepositData array
 * This function combines validation and parsing logic
 */
const parseAndValidateJson = (
  data: string,
): {
  depositData: DepositData[];
  error?: string;
} => {
  // Check for empty data
  if (!data || data.trim() === '') {
    return {
      depositData: [],
      error: 'Deposit data should not be empty',
    };
  }

  // Check size limit
  if (data.length > MAX_JSON_LENGTH) {
    return {
      depositData: [],
      error: `Deposit data is too large (max ${Math.round(MAX_JSON_LENGTH / 1024 / 1024)}MB)`,
    };
  }

  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(data);
  } catch {
    return {
      depositData: [],
      error: 'Invalid JSON format',
    };
  }

  // Ensure we have an array and convert hex fields to Hex type
  const rawItems = Array.isArray(parsed) ? parsed : [parsed];

  // Basic validation of each item
  for (const [index, item] of rawItems.entries()) {
    if (!item || typeof item !== 'object') {
      return {
        depositData: [],
        error: `Item at index ${index} should be an object`,
      };
    }
  }

  const depositData: DepositData[] = rawItems.map((item: any) => ({
    ...item,
    pubkey: toHexIfPresent(item.pubkey),
    withdrawal_credentials: toHexIfPresent(item.withdrawal_credentials),
    signature: toHexIfPresent(item.signature),
    deposit_message_root: toHexIfPresent(item.deposit_message_root),
    deposit_data_root: toHexIfPresent(item.deposit_data_root),
    fork_version: toHexIfPresent(item.fork_version),
    network_name: item.network_name || item.eth2_network_name, // Support both v1 and v2 field names
  }));

  // Validate array is not empty
  if (depositData.length === 0) {
    return {
      depositData: [],
      error: 'Deposit data should contain at least 1 key',
    };
  }

  // Check for required fields
  for (const [index, item] of depositData.entries()) {
    for (const field of requiredFields) {
      if (item[field] === undefined || item[field] === null) {
        return {
          depositData: [],
          error: `Item at index ${index} is missing required field: ${field}`,
        };
      }
    }
  }

  return { depositData };
};

/**
 * Parse deposit data JSON with comprehensive error handling
 */
export const parseDepositData = (jsonDepositData: string): ParseResult => {
  const normalizedJson = normalizeHexInJson(jsonDepositData);
  const result = parseAndValidateJson(normalizedJson);

  if (result.error) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    data: result.depositData,
  };
};

/**
 * Remove a key at specified index with enhanced error handling
 */
export const removeKey = (
  jsonDepositData: string,
  index: number,
): RemoveKeyResult => {
  // Validate index parameter
  if (!Number.isInteger(index) || index < 0) {
    return {
      success: false,
      error: 'Index must be a non-negative integer',
    };
  }

  // Parse the JSON first
  const parseResult = parseDepositData(jsonDepositData);
  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error || 'Failed to parse deposit data',
    };
  }

  const depositData = parseResult.data;

  // Validate index is within bounds
  if (index >= depositData.length) {
    return {
      success: false,
      error: `Index ${index} is out of bounds (array length: ${depositData.length})`,
    };
  }

  // Remove the item
  const updatedData = [...depositData];
  updatedData.splice(index, 1);

  // Return result
  const json =
    updatedData.length > 0 ? JSON.stringify(updatedData, null, 2) : '';

  return {
    success: true,
    data: updatedData,
    json,
  };
};
