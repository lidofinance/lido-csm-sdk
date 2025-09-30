import { KEY_TTL_DURATION } from './constants.js';
import { KeysRecord } from './types.js';

type SerializeLocalStorageResult =
  | { success: true }
  | { success: false; error: Error };

type DeserializeLocalStorageResult<T> =
  | { success: true; value: T }
  | { success: false; error: Error };

// Low-level storage functions
const trySerializeToLocalStorage = (
  key: string,
  value: unknown,
): SerializeLocalStorageResult => {
  try {
    const item = JSON.stringify(value);
    localStorage.setItem(key, item);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
};

const tryDeserializeFromLocalStorage = <T>(
  key: string,
): DeserializeLocalStorageResult<T> => {
  try {
    const item = localStorage.getItem(key);

    if (item === null) {
      return {
        success: false,
        error: new Error(`Item with key "${key}" does not exist`),
      };
    }

    const value = JSON.parse(item) as T;
    return { success: true, value };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
    };
  }
};

// Error-swallowing wrappers for localStorage operations
export const saveToLocalStorage = (key: string, value: unknown): void => {
  const result = trySerializeToLocalStorage(key, value);

  if (!result.success) {
    console.error('[keys cache localStorage] save error:', result.error);
  }
};

export const getFromLocalStorage = <T>(key: string): T | null => {
  const result = tryDeserializeFromLocalStorage<T>(key);

  if (result.success) {
    return result.value;
  } else {
    if (!localStorage.getItem(key)) {
      return null; // Item doesn't exist, don't log error
    }
    console.error('[keys cache localStorage] get error:', result.error);
    return null;
  }
};

export const isKeyExpired = (timestamp: number): boolean => {
  const now = Date.now();
  const age = now - timestamp;
  return age >= KEY_TTL_DURATION;
};

export const cleanExpiredKeys = (keys: KeysRecord): KeysRecord => {
  return Object.entries(keys).reduce((cleanedKeys, [pubKey, timestamp]) => {
    if (!isKeyExpired(timestamp)) {
      cleanedKeys[pubKey] = timestamp;
    }
    return cleanedKeys;
  }, {} as KeysRecord);
};
