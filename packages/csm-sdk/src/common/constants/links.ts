import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { PerSupportedChain } from './supported-chains.js';

export enum LINK_TYPE {
  icsTree = 'icsTree',
  curatedGateTree = 'curatedGateTree',
  rewardsTree = 'rewardsTree',
  keysApi = 'keysApi',
  feesMonitoringApi = 'feesMonitoringApi',
}

export const EXTERNAL_LINKS: PerSupportedChain<{
  [key2 in LINK_TYPE]?: string;
}> = {
  [CHAINS.Mainnet]: {
    [LINK_TYPE.icsTree]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/main/artifacts/mainnet/ics/merkle-tree.json',
    [LINK_TYPE.rewardsTree]:
      'https://raw.githubusercontent.com/lidofinance/csm-rewards/mainnet/tree.json',
    [LINK_TYPE.keysApi]: 'https://keys-api.lido.fi',
    [LINK_TYPE.feesMonitoringApi]: 'https://api-fees-monitoring.lido.fi',
  },
  [CHAINS.Hoodi]: {
    [LINK_TYPE.icsTree]:
      'https://raw.githubusercontent.com/lidofinance/community-staking-module/refs/heads/main/artifacts/hoodi/ics/merkle-tree.json',
    [LINK_TYPE.rewardsTree]:
      'https://raw.githubusercontent.com/lidofinance/csm-rewards/hoodi/tree.json',
    [LINK_TYPE.keysApi]: 'https://keys-api-hoodi.testnet.fi',
    [LINK_TYPE.feesMonitoringApi]:
      'https://api-fees-monitoring-hoodi.testnet.fi',
  },
};
