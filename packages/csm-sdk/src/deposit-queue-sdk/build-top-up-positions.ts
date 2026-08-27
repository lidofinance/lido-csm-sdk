import { Hex } from 'viem';

export const buildTopUpPositions = (pubkeys: Hex[]): Map<Hex, number> => {
  const positions = new Map<Hex, number>();

  pubkeys.forEach((pubkey, position) => {
    const key = pubkey.toLowerCase() as Hex;
    if (!positions.has(key)) positions.set(key, position);
  });

  return positions;
};
