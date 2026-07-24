import { defineChain, type Chain } from 'viem';
import { mainnet } from 'viem/chains';
import { CHAIN_ID } from './env';

export const hoodi = defineChain({
  id: CHAIN_ID.HOODI,
  name: 'Hoodi',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://ethereum-hoodi-rpc.publicnode.com'] } },
  testnet: true,
});

export const chainById = (id: number): Chain => {
  if (id === CHAIN_ID.MAINNET) return mainnet;
  if (id === CHAIN_ID.HOODI) return hoodi;
  throw new Error(`Unsupported test chain: ${id}`);
};
