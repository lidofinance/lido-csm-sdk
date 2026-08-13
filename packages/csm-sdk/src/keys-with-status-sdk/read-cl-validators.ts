import { Hex } from 'viem';
import { chunkArray, pooledMap } from '../common/utils/index';
import { getClUrls, METHOD } from './cl-chunks';
import { ClRequestError, fetchClValidators } from './cl-fetch';
import { CL_GET_CONCURRENCY, CL_POST_MAX_IDS } from './consts';
import { ClPreparedKey } from './parse-cl-response';

const fetchPostChunk = async (
  baseUrl: string,
  ids: Hex[],
): Promise<ClPreparedKey[]> => {
  const result = await fetchClValidators(`${baseUrl}${METHOD}`, {
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    },
  });

  // A proxy that accepts POST but ignores the body answers 200 with the whole
  // validator set. Subset check, not a length check: `result.length <
  // pubkeys.length` is the NORMAL case — keys not yet deposited are unknown
  // to the CL.
  const requested = new Set(ids.map((pubkey) => pubkey.toLowerCase()));
  if (result.some(({ pubkey }) => !requested.has(pubkey.toLowerCase()))) {
    throw new ClRequestError(
      'CL endpoint ignored the POST id filter',
      undefined,
      true,
    );
  }

  return result;
};

const fetchViaPost = async (
  baseUrl: string,
  pubkeys: Hex[],
  concurrency: number,
): Promise<ClPreparedKey[]> => {
  const chunks = await pooledMap(
    chunkArray(pubkeys, CL_POST_MAX_IDS),
    concurrency,
    (ids) => fetchPostChunk(baseUrl, ids),
  );
  return chunks.flat();
};

const fetchViaGet = async (
  baseUrl: string,
  pubkeys: Hex[],
  concurrency: number,
): Promise<ClPreparedKey[]> => {
  const urls = getClUrls(pubkeys, baseUrl);
  const chunks = await pooledMap(urls, concurrency, (url) =>
    fetchClValidators(url),
  );
  return chunks.flat();
};

export type ReadClValidatorsProps = {
  baseUrl: string;
  pubkeys: Hex[];
  concurrency?: number;
};

/**
 * Validator statuses from one CL endpoint: POST (beacon-APIs v2.5.0+), falling
 * back to chunked GET because `clApiUrl` is consumer-supplied and may front a
 * proxy without POST support. Resolves complete or throws — never partial.
 *
 * POST is re-probed on every call: a browser CORS rejection is indistinguishable
 * from a dropped connection, so one failure never proved POST unsupported.
 */
export const readClValidators = async ({
  baseUrl,
  pubkeys,
  concurrency = CL_GET_CONCURRENCY,
}: ReadClValidatorsProps): Promise<ClPreparedKey[]> => {
  if (pubkeys.length === 0) return [];

  try {
    return await fetchViaPost(baseUrl, pubkeys, concurrency);
  } catch (error) {
    if (!(error instanceof ClRequestError) || !error.isCapabilitySignal) {
      throw error;
    }
    try {
      return await fetchViaGet(baseUrl, pubkeys, concurrency);
    } catch (getError) {
      // Keep why we fell back — a misconfigured proxy is otherwise
      // undebuggable from the thrown error alone.
      if (getError instanceof Error && getError.cause === undefined) {
        getError.cause = error;
      }
      throw getError;
    }
  }
};
