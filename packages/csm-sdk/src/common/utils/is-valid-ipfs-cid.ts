/**
 * Validates IPFS CID format using heuristics.
 * Supports CIDv0 (Qm...) and CIDv1 (bafy.../bafk...) formats.
 */
export const isValidIpfsCid = (cid: string): boolean => {
  if (!cid || cid.length < 46) return false;
  return cid.startsWith('Qm') || cid.startsWith('baf');
};
