import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { PerSupportedChain } from './supported-chains';

export const DEFAULT_IPFS_GATEWAYS = [
  'https://ipfs.aleph.cloud/ipfs/{cid}',
  'https://{cid}.ipfs.ipfs.hypha.coop/',
  'https://ipfs.orbitor.dev/ipfs/{cid}',
  'https://ipfs.filebase.io/ipfs/{cid}',
  'https://gateway.pinata.cloud/ipfs/{cid}',
];

export enum API_NAME {
  keys = 'keys',
  feesMonitoring = 'feesMonitoring',
}

export const API_URLS: PerSupportedChain<Partial<Record<API_NAME, string>>> = {
  [CHAINS.Mainnet]: {
    [API_NAME.keys]: 'https://keys-api.lido.fi',
    [API_NAME.feesMonitoring]: 'https://api-fees-monitoring.lido.fi',
  },
  [CHAINS.Hoodi]: {
    [API_NAME.keys]: 'https://keys-api-hoodi.testnet.fi',
    [API_NAME.feesMonitoring]: 'https://api-fees-monitoring-hoodi.testnet.fi',
  },
};
