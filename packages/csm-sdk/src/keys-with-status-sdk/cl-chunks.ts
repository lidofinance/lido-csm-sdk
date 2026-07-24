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
