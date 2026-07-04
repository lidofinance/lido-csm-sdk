import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { CONTRACT_NAMES } from './contract-names';
import { PerSupportedChain } from './supported-chains';

export const DEFAULT_IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/{cid}',
  'https://gateway.pinata.cloud/ipfs/{cid}',
];

export const MERKLE_TREE_FALLBACKS: PerSupportedChain<
  Partial<Record<CONTRACT_NAMES, string>>
> = {
  [CHAINS.Mainnet]: {
    [CONTRACT_NAMES.icsGate]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/main/artifacts/mainnet/ics/merkle-tree.json',
    [CONTRACT_NAMES.idvtcGate]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/mainnet/idvtc/merkle-tree.json',
    [CONTRACT_NAMES.curatedGatePTO]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/mainnet/curated/gates/pto/merkle-tree.json',
    [CONTRACT_NAMES.curatedGatePGO]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/mainnet/curated/gates/pgo/merkle-tree.json',
    [CONTRACT_NAMES.curatedGateIODC]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/mainnet/curated/gates/iodvtc/merkle-tree.json',
    [CONTRACT_NAMES.feeDistributor]:
      'https://raw.githubusercontent.com/lidofinance/csm-rewards/mainnet/tree.json',
  },
  [CHAINS.Hoodi]: {
    [CONTRACT_NAMES.icsGate]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/main/artifacts/hoodi/ics/merkle-tree.json',
    [CONTRACT_NAMES.curatedGatePTO]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/hoodi/curated/gates/PTO/merkle-tree.json',
    [CONTRACT_NAMES.curatedGatePGO]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/hoodi/curated/gates/PGO/merkle-tree.json',
    [CONTRACT_NAMES.curatedGateDO]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/hoodi/curated/gates/DO/merkle-tree.json',
    [CONTRACT_NAMES.curatedGateEEO]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/hoodi/curated/gates/EE/merkle-tree.json',
    [CONTRACT_NAMES.curatedGateIODC]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/hoodi/curated/gates/IDVC/merkle-tree.json',
    [CONTRACT_NAMES.curatedGateIODCP]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/develop/artifacts/hoodi/curated/gates/IDVC%2B/merkle-tree.json',
    [CONTRACT_NAMES.feeDistributor]:
      'https://raw.githubusercontent.com/lidofinance/csm-rewards/hoodi/tree.json',
  },
};

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
