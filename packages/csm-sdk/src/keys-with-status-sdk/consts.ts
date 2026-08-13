import { parseEther } from 'viem';

export const MIN_EFFECTIVE_BALANCE = parseEther('32');
export const MAX_EFFECTIVE_BALANCE = parseEther('2048');

/** Max simultaneous CL requests on the chunked GET fallback path. */
export const CL_GET_CONCURRENCY = 4;

/** Retries per CL request on 429 / 503, on top of the initial attempt. */
export const CL_RETRY_ATTEMPTS = 2;

/**
 * Max pubkeys per POST body — ~505 KB at ~101 B/key, half nginx's 1 MB default,
 * since `clApiUrl` may sit behind an unknown proxy. The spec sets no limit.
 */
export const CL_POST_MAX_IDS = 5000;
