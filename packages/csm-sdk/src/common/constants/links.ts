import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { CSM_SUPPORTED_CHAINS } from './base.js';

export enum LINK_TYPE {
  rewardsTree = 'rewardsTree',
  keysApi = 'keysApi',
}

export const EXTERNAL_LINKS: {
  [key in CSM_SUPPORTED_CHAINS]: { [key2 in LINK_TYPE]?: string };
} = {
  [CHAINS.Mainnet]: {
    [LINK_TYPE.rewardsTree]:
      'https://raw.githubusercontent.com/lidofinance/csm-rewards/mainnet/tree.json',
    [LINK_TYPE.keysApi]: 'https://keys-api.lido.fi',
  },
  [CHAINS.Hoodi]: {
    [LINK_TYPE.rewardsTree]:
      'https://raw.githubusercontent.com/lidofinance/csm-rewards/hoodi/tree.json',
    [LINK_TYPE.keysApi]: 'https://keys-api-hoodi.testnet.fi',
  },
  [CHAINS.Holesky]: {
    [LINK_TYPE.rewardsTree]:
      'https://raw.githubusercontent.com/lidofinance/csm-rewards/holesky/tree.json',
    [LINK_TYPE.keysApi]: 'https://keys-api-holesky.testnet.fi',
  },
};
