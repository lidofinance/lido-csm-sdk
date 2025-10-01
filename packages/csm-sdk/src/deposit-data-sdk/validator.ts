import { compareLowercase } from '../common/utils/compare-lowercase.js';
import { isHexadecimalString, trimHexPrefix } from '../common/utils/index.js';
import {
  DepositData,
  DepositDataV1,
  DepositDataV2,
  DuplicateProcessingConfig,
  ValidationProps,
  ValidationError,
  ValidationErrorCode,
  ValidationExtendedProps,
} from './types.js';
import {
  DEPOSIT_ROOT_LENGTH,
  FIXED_AMOUNT,
  FIXED_FORK_VERSION,
  FIXED_NETWORK,
  FIXED_WC_PREFIX,
  PUBKEY_LENGTH,
  SIGNATURE_LENGTH,
  WITHDRAWAL_CREDENTIALS_LENGTH,
} from './constants.js';
import { verifyDepositSignature } from './signature.js';

const validateBasicFields = (
  data: DepositData,
  index: number,
  config: ValidationProps,
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Validate pubkey
  if (!isHexadecimalString(data.pubkey, PUBKEY_LENGTH)) {
    errors.push({
      index,
      field: 'pubkey',
      message: 'pubkey is not valid string',
      code: ValidationErrorCode.INVALID_PUBKEY,
    });
  }

  // Validate signature
  if (!isHexadecimalString(data.signature, SIGNATURE_LENGTH)) {
    errors.push({
      index,
      field: 'signature',
      message: 'signature is not valid string',
      code: ValidationErrorCode.INVALID_SIGNATURE,
    });
  }

  // Validate deposit_message_root
  if (!isHexadecimalString(data.deposit_message_root, DEPOSIT_ROOT_LENGTH)) {
    errors.push({
      index,
      field: 'deposit_message_root',
      message: 'deposit_message_root is not a valid string',
      code: ValidationErrorCode.INVALID_DEPOSIT_ROOT,
    });
  }

  // Validate deposit_data_root
  if (!isHexadecimalString(data.deposit_data_root, DEPOSIT_ROOT_LENGTH)) {
    errors.push({
      index,
      field: 'deposit_data_root',
      message: 'deposit_data_root is not a valid string',
      code: ValidationErrorCode.INVALID_DEPOSIT_ROOT,
    });
  }

  // Validate withdrawal_credentials
  if (
    !isHexadecimalString(
      data.withdrawal_credentials,
      WITHDRAWAL_CREDENTIALS_LENGTH,
    )
  ) {
    errors.push({
      index,
      field: 'withdrawal_credentials',
      message: 'withdrawal_credentials is not a valid string',
      code: ValidationErrorCode.INVALID_WITHDRAWAL_CREDENTIALS,
    });
  } else if (
    !compareLowercase(
      trimHexPrefix(data.withdrawal_credentials),
      `${FIXED_WC_PREFIX}${trimHexPrefix(config.withdrawalCredentials)}`,
    ) &&
    !compareLowercase(
      trimHexPrefix(data.withdrawal_credentials),
      trimHexPrefix(config.withdrawalCredentials),
    )
  ) {
    errors.push({
      index,
      field: 'withdrawal_credentials',
      message: `withdrawal_credentials is not the Lido Withdrawal Vault`,
      code: ValidationErrorCode.INVALID_WITHDRAWAL_CREDENTIALS,
    });
  }

  // Validate amount
  if (data.amount !== FIXED_AMOUNT) {
    errors.push({
      index,
      field: 'amount',
      message: 'amount is not equal to 32 eth',
      code: ValidationErrorCode.INVALID_AMOUNT,
    });
  }

  // Validate network name
  const requiredNetworkName = FIXED_NETWORK[config.chainId];
  const networkName =
    (data as DepositDataV2).network_name ||
    (data as DepositDataV1).eth2_network_name;

  if (!(networkName === requiredNetworkName)) {
    errors.push({
      index,
      field: 'network_name',
      message: `network_name or eth2_network_name is not equal to ${requiredNetworkName}`,
      code: ValidationErrorCode.INVALID_NETWORK,
    });
  }

  // Validate fork version
  const forkVersion = FIXED_FORK_VERSION[config.chainId];
  if (data.fork_version !== forkVersion) {
    errors.push({
      index,
      field: 'fork_version',
      message: `fork_version is not equal to ${forkVersion}`,
      code: ValidationErrorCode.INVALID_FORK_VERSION,
    });
  }

  return errors;
};

const processDuplicatePubkey = (config: DuplicateProcessingConfig): void => {
  const existingIndices = config.pubkeyMap.get(config.pubkey);
  if (!existingIndices) {
    config.pubkeyMap.set(config.pubkey, [config.index]);
    return;
  }

  existingIndices.push(config.index);

  existingIndices.forEach((idx) => {
    const hasExistingError = config.errors.some(
      (e) => e.index === idx && e.code === ValidationErrorCode.DUPLICATE_PUBKEY,
    );

    if (hasExistingError) {
      return;
    }

    config.errors.push({
      index: idx,
      field: 'pubkey',
      message: 'pubkey is duplicated in deposit data',
      code: ValidationErrorCode.DUPLICATE_PUBKEY,
    });
  });
};

const performBasicValidation = (
  depositData: DepositData[],
  config: ValidationProps,
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const pubkeyMap = new Map<string, number[]>();

  // Single pass: basic validation + duplicate detection
  for (const [i, data] of depositData.entries()) {
    if (!data) {
      errors.push({
        index: i,
        message: 'deposit data item is missing',
        code: ValidationErrorCode.MISSING_FIELD,
      });
      continue;
    }

    // Basic field validation
    const basicErrors = validateBasicFields(data, i, config);
    errors.push(...basicErrors);

    // Efficient duplicate detection using Map
    const pubkey = data.pubkey?.toLowerCase();
    if (pubkey) {
      processDuplicatePubkey({
        pubkey,
        index: i,
        pubkeyMap,
        errors,
      });
    }
  }

  return errors;
};

export const validateDepositData = async (
  depositData: DepositData[],
  options: ValidationExtendedProps,
): Promise<ValidationError[]> => {
  const errors = performBasicValidation(depositData, {
    chainId: options.chainId,
    withdrawalCredentials: options.withdrawalCredentials,
  });

  // Parallel signature verification for valid items only
  const signatureVerificationPromises = depositData.map((data, index) => {
    if (!data) {
      return Promise.resolve({ index, isValid: false });
    }
    return verifyDepositSignature(data, options.chainId)
      .then((isValid) => ({ index, isValid }))
      .catch(() => ({ index, isValid: false }));
  });

  const signatureResults = await Promise.all(signatureVerificationPromises);

  // Process signature verification results
  signatureResults.forEach(({ index, isValid }) => {
    if (!isValid) {
      errors.push({
        index,
        field: 'signature',
        message: 'invalid signature',
        code: ValidationErrorCode.INVALID_BLS_SIGNATURE,
      });
    }
  });

  return errors;
};

/**
 * Quick validation that only checks basic fields without async operations
 */
export const validateDepositDataSync = (
  depositData: DepositData[],
  config: ValidationProps,
): ValidationError[] => {
  return performBasicValidation(depositData, config);
};
