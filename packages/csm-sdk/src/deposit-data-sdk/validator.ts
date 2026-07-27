import { Hex } from 'viem';
import { chunkArray } from '../common/utils/chunk-array';
import { compareLowercase } from '../common/utils/compare-lowercase';
import {
  isHexadecimalString,
  toHexString,
  trimHexPrefix,
} from '../common/utils/index';
import {
  BLS_VERIFICATION_CHUNK_SIZE,
  DEPOSIT_ROOT_LENGTH,
  FIXED_AMOUNT,
  FIXED_FORK_VERSION,
  FIXED_NETWORK,
  PUBKEY_LENGTH,
  SIGNATURE_LENGTH,
  WITHDRAWAL_CREDENTIALS_LENGTH,
} from './constants';
import { verifyDepositSignature } from './signature';
import {
  DepositData,
  DuplicateProcessingConfig,
  ValidationError,
  ValidationErrorCode,
  ValidationExtendedProps,
  ValidationProps,
} from './types';

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
      message: 'pubkey is not a valid hex string',
      code: ValidationErrorCode.INVALID_PUBKEY,
    });
  }

  // Validate signature
  if (!isHexadecimalString(data.signature, SIGNATURE_LENGTH)) {
    errors.push({
      index,
      field: 'signature',
      message: 'signature is not a valid hex string',
      code: ValidationErrorCode.INVALID_SIGNATURE,
    });
  }

  // Validate deposit_message_root
  if (!isHexadecimalString(data.deposit_message_root, DEPOSIT_ROOT_LENGTH)) {
    errors.push({
      index,
      field: 'deposit_message_root',
      message: 'deposit_message_root is not a valid hex string',
      code: ValidationErrorCode.INVALID_DEPOSIT_ROOT,
    });
  }

  // Validate deposit_data_root
  if (!isHexadecimalString(data.deposit_data_root, DEPOSIT_ROOT_LENGTH)) {
    errors.push({
      index,
      field: 'deposit_data_root',
      message: 'deposit_data_root is not a valid hex string',
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
      message: 'withdrawal_credentials is not a valid hex string',
      code: ValidationErrorCode.INVALID_WITHDRAWAL_CREDENTIALS,
    });
  } else {
    const wcHex = trimHexPrefix(data.withdrawal_credentials);
    const expectedAddress = trimHexPrefix(config.withdrawalCredentials);

    const wcTypeHex = toHexString(config.wcPrefix.replace(/0+$/, ''));
    if (!wcHex.toLowerCase().startsWith(config.wcPrefix.toLowerCase())) {
      errors.push({
        index,
        field: 'withdrawal_credentials',
        message: `wrong key type: only ${wcTypeHex} withdrawal credentials are supported`,
        code: ValidationErrorCode.UNSUPPORTED_WC_TYPE,
      });
    } else if (
      !compareLowercase(wcHex, `${config.wcPrefix}${expectedAddress}`)
    ) {
      errors.push({
        index,
        field: 'withdrawal_credentials',
        message: 'withdrawal_credentials is not the Lido Withdrawal Vault',
        code: ValidationErrorCode.INVALID_WITHDRAWAL_CREDENTIALS,
      });
    }
  }

  // Validate amount
  if (data.amount !== FIXED_AMOUNT) {
    errors.push({
      index,
      field: 'amount',
      message: 'amount is not equal to 32 ETH',
      code: ValidationErrorCode.INVALID_AMOUNT,
    });
  }

  // Validate network name
  const requiredNetworkName = FIXED_NETWORK[config.chainId];
  const networkName = data.network_name;

  if (!(networkName === requiredNetworkName)) {
    errors.push({
      index,
      field: 'network_name',
      message: `network_name is not equal to ${requiredNetworkName}`,
      code: ValidationErrorCode.INVALID_NETWORK,
    });
  }

  // Validate fork version
  const forkVersion = FIXED_FORK_VERSION[config.chainId];
  if (
    data.fork_version !== forkVersion &&
    data.fork_version !== toHexString(forkVersion)
  ) {
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
  const pubkeyMap = new Map<Hex, number[]>();

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
    const pubkey = data.pubkey?.toLowerCase() as Hex;
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
    wcPrefix: options.wcPrefix,
  });

  if (options.skipSignature) {
    return errors;
  }

  // Items that already failed basic validation are skipped: their fields
  // can't be trusted to build a meaningful signing root, and re-verifying
  // them wastes BLS cycles for a result that's already invalid.
  const invalidIndices = new Set(errors.map((e) => e.index));
  const itemsToVerify = depositData
    .map((data, index) => ({ data, index }))
    .filter(
      (item): item is { data: DepositData; index: number } =>
        !!item.data && !invalidIndices.has(item.index),
    );

  const chunks = chunkArray(itemsToVerify, BLS_VERIFICATION_CHUNK_SIZE);

  for (const [chunkIndex, chunk] of chunks.entries()) {
    // A rejected verifyDepositSignature means BLS verification couldn't run
    // at all (e.g. WASM init/verify throwing in a CSP-restricted browser) —
    // the item's data may well be fine, so it's reported per-item as
    // BLS_VERIFICATION_UNAVAILABLE rather than rejecting the whole batch.
    const signatureResults = await Promise.all(
      chunk.map(({ data, index }) =>
        verifyDepositSignature(data, options.chainId).then(
          (isValid) => ({ index, isValid, unavailable: false }),
          () => ({ index, isValid: false, unavailable: true }),
        ),
      ),
    );

    signatureResults.forEach(({ index, isValid, unavailable }) => {
      if (unavailable) {
        errors.push({
          index,
          field: 'signature',
          message: 'BLS signature verification is unavailable',
          code: ValidationErrorCode.BLS_VERIFICATION_UNAVAILABLE,
        });
      } else if (!isValid) {
        errors.push({
          index,
          field: 'signature',
          message: 'signature failed BLS verification',
          code: ValidationErrorCode.INVALID_BLS_SIGNATURE,
        });
      }
    });

    if (chunkIndex < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return errors;
};
