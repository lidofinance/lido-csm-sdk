import { chunkArray } from '../common/utils/index';

const MAX_URL_LENGTH = 2048 - 66; // proxy gap
export const METHOD = '/eth/v1/beacon/states/head/validators';

/**
 * Keys that fit in one query string. Clamped to >= 1: a base URL long enough to
 * exhaust the budget is unusable config, better surfaced at the HTTP layer.
 */
export const getKeysPerChunk = (url: string, keyLength = 0) => {
  const maxKeysQueryLength = MAX_URL_LENGTH - url.length - 4; // '?id='.length
  return Math.max(
    1,
    Math.floor(
      (maxKeysQueryLength + 3) / (keyLength + 3), // 3 = encodeURIComponent(',').length
    ),
  );
};

export const getClUrls = (keys: string[] = [], base: string): string[] => {
  const url = `${base}${METHOD}`;
  const maxKeyPerChunk = getKeysPerChunk(url, keys?.[0]?.length);
  const chunks = chunkArray(keys, maxKeyPerChunk);
  return chunks.map(
    (keys) => `${url}?id=${keys.join(encodeURIComponent(','))}`,
  );
};
