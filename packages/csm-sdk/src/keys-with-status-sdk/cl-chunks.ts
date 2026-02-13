import { KEY_STATUS } from '../common/index.js';
import { ClKey, ClPreparedKey, CLStatus } from './types.js';

const MAX_URL_LENGTH = 2048 - 66; // proxy gap
const METHOD = '/eth/v1/beacon/states/head/validators';

export const getKeysPerChunk = (url: string, keyLength = 0) => {
  const maxKeysQueryLength = MAX_URL_LENGTH - url.length - 4; // '?id='.length
  return Math.floor(
    (maxKeysQueryLength + 3) / (keyLength + 3), // 3 = encodeURIComponent(',').length
  );
};

export const getChunks = (arr: string[] = [], max: number) =>
  Array.from({ length: Math.ceil(arr.length / max) })
    .fill(null)
    .map((_, index) => arr.slice(index * max, (index + 1) * max));

export const getClUrls = (keys: string[] = [], base: string): string[] => {
  const url = `${base}${METHOD}`;
  const maxKeyPerChunk = getKeysPerChunk(url, keys?.[0]?.length);
  const chunks = getChunks(keys, maxKeyPerChunk);
  return chunks.map(
    (keys) => `${url}?id=${keys.join(encodeURIComponent(','))}`,
  );
};

export const prepareKey = (key: ClKey): ClPreparedKey => ({
  validatorIndex: key.index,
  pubkey: key.validator.pubkey,
  slashed: key.validator.slashed,
  status: StatusMap[key.status],
  activationEpoch: BigInt(key.validator.activation_epoch),
  effectiveBalance: BigInt(key.validator.effective_balance),
});

const StatusMap: Record<CLStatus, KEY_STATUS> = {
  pending_initialized: KEY_STATUS.DEPOSITABLE,
  pending_queued: KEY_STATUS.ACTIVATION_PENDING,
  active_ongoing: KEY_STATUS.ACTIVE,
  active_exiting: KEY_STATUS.EXITING,
  active_slashed: KEY_STATUS.EXITING,
  exited_unslashed: KEY_STATUS.WITHDRAWAL_PENDING,
  exited_slashed: KEY_STATUS.WITHDRAWAL_PENDING,
  withdrawal_possible: KEY_STATUS.WITHDRAWAL_PENDING,
  withdrawal_done: KEY_STATUS.WITHDRAWN,
};
