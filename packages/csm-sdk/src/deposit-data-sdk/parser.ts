import { DepositData, ParseResult, RemoveKeyResult } from './types.js';
import { MAX_JSON_LENGTH } from './constants.js';

/**
 * Normalizes hex values in JSON by removing '0x' prefixes
 */
const normalizeHexInJson = (text: string): string => {
  return text.replace(/"0x/gm, '"');
};

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
      error: `Deposit data is too big (max ${Math.round(MAX_JSON_LENGTH / 1024 / 1024)}MB)`,
    };
  }

  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(data);
  } catch (error) {
    return {
      depositData: [],
      error: 'Invalid JSON format',
    };
  }

  // Ensure we have an array
  const depositData: DepositData[] = Array.isArray(parsed) ? parsed : [parsed];

  // Validate array is not empty
  if (depositData.length === 0) {
    return {
      depositData: [],
      error: 'Should have at least 1 key',
    };
  }

  // Basic validation of each item
  for (const [index, item] of depositData.entries()) {
    if (!item || typeof item !== 'object') {
      return {
        depositData: [],
        error: `Item at index ${index} should be an object`,
      };
    }

    // Check for required fields
    const requiredFields = [
      'pubkey',
      'withdrawal_credentials',
      'amount',
      'signature',
      'deposit_message_root',
      'deposit_data_root',
      'fork_version',
    ];

    for (const field of requiredFields) {
      if (!(field in item)) {
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
  const updatedData = Array.from(depositData);
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
