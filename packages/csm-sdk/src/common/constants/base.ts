import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';

import { Erc20Tokens } from '../types.js';
import { TOKENS } from './tokens.js';

export const CSM_SUPPORTED_CHAINS = [CHAINS.Mainnet, CHAINS.Hoodi];
export type CSM_SUPPORTED_CHAINS = CHAINS.Mainnet | CHAINS.Hoodi;

export enum CSM_CONTRACT_NAMES {
  csAccounting = 'csAccounting',
  csEjector = 'csEjector',
  csExitPenalties = 'csExitPenalties',
  csFeeDistributor = 'csFeeDistributor',
  csFeeOracle = 'csFeeOracle',
  csModule = 'csModule',
  csParametersRegistry = 'csParametersRegistry',
  csStrikes = 'csStrikes',
  hashConsensus = 'hashConsensus',
  permissionlessGate = 'permissionlessGate',
  vettedGate = 'vettedGate',
  stakingRouter = 'stakingRouter',
  validatorsExitBusOracle = 'validatorsExitBusOracle',
  withdrawalVault = 'withdrawalVault',
  lidoRewardsVault = 'lidoRewardsVault',
  stETH = TOKENS.steth,
  wstETH = TOKENS.wsteth,
  CSMSatellite = 'CSMSatellite',
}

export const CSM_CONTRACT_ADDRESSES: {
  [key in CSM_SUPPORTED_CHAINS]?: {
    [key2 in CSM_CONTRACT_NAMES | Erc20Tokens]?: Address;
  };
} = {
  [CHAINS.Mainnet]: {
    [CSM_CONTRACT_NAMES.csEjector]:
      '0xc72b58aa02E0e98cF8A4a0E9Dce75e763800802C',
    [CSM_CONTRACT_NAMES.csParametersRegistry]:
      '0x9D28ad303C90DF524BA960d7a2DAC56DcC31e428',
    [CSM_CONTRACT_NAMES.csStrikes]:
      '0xaa328816027F2D32B9F56d190BC9Fa4A5C07637f',
    [CSM_CONTRACT_NAMES.permissionlessGate]:
      '0xcF33a38111d0B1246A3F38a838fb41D626B454f0',
    [CSM_CONTRACT_NAMES.vettedGate]:
      '0xB314D4A76C457c93150d308787939063F4Cc67E0',
    [CSM_CONTRACT_NAMES.csExitPenalties]:
      '0x06cd61045f958A209a0f8D746e103eCc625f4193',

    [CSM_CONTRACT_NAMES.csAccounting]:
      '0x4d72BFF1BeaC69925F8Bd12526a39BAAb069e5Da',
    [CSM_CONTRACT_NAMES.csFeeDistributor]:
      '0xD99CC66fEC647E68294C6477B40fC7E0F6F618D0',
    [CSM_CONTRACT_NAMES.csFeeOracle]:
      '0x4D4074628678Bd302921c20573EEa1ed38DdF7FB',
    [CSM_CONTRACT_NAMES.csModule]: '0xdA7dE2ECdDfccC6c3AF10108Db212ACBBf9EA83F',
    [CSM_CONTRACT_NAMES.hashConsensus]:
      '0x71093efF8D8599b5fA340D665Ad60fA7C80688e4',
    [CSM_CONTRACT_NAMES.validatorsExitBusOracle]:
      '0x0De4Ea0184c2ad0BacA7183356Aea5B8d5Bf5c6e',
    [CSM_CONTRACT_NAMES.stakingRouter]:
      '0xFdDf38947aFB03C621C71b06C9C70bce73f12999',
    [CSM_CONTRACT_NAMES.withdrawalVault]:
      '0xB9D7934878B5FB9610B3fE8A5e441e8fad7E293f',
    [CSM_CONTRACT_NAMES.lidoRewardsVault]:
      '0x388C818CA8B9251b393131C08a736A67ccB19297',
    [CSM_CONTRACT_NAMES.stETH]: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    [CSM_CONTRACT_NAMES.wstETH]: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  },
  [CHAINS.Hoodi]: {
    [CSM_CONTRACT_NAMES.csAccounting]:
      '0xA54b90BA34C5f326BC1485054080994e38FB4C60',
    [CSM_CONTRACT_NAMES.csFeeDistributor]:
      '0xaCd9820b0A2229a82dc1A0770307ce5522FF3582',
    [CSM_CONTRACT_NAMES.csFeeOracle]:
      '0xe7314f561B2e72f9543F1004e741bab6Fc51028B',
    [CSM_CONTRACT_NAMES.csModule]: '0x79CEf36D84743222f37765204Bec41E92a93E59d',
    [CSM_CONTRACT_NAMES.hashConsensus]:
      '0x54f74a10e4397dDeF85C4854d9dfcA129D72C637',
    [CSM_CONTRACT_NAMES.csEjector]:
      '0x777bd76326E4aDcD353b03AD45b33BAF41048476',
    [CSM_CONTRACT_NAMES.csExitPenalties]:
      '0xD259b31083Be841E5C85b2D481Cfc17C14276800',
    [CSM_CONTRACT_NAMES.csParametersRegistry]:
      '0xA4aD5236963f9Fe4229864712269D8d79B65C5Ad',
    [CSM_CONTRACT_NAMES.csStrikes]:
      '0x8fBA385C3c334D251eE413e79d4D3890db98693c',
    [CSM_CONTRACT_NAMES.permissionlessGate]:
      '0x5553077102322689876A6AdFd48D75014c28acfb',
    [CSM_CONTRACT_NAMES.vettedGate]:
      '0x10a254E724fe2b7f305F76f3F116a3969c53845f',
    [CSM_CONTRACT_NAMES.validatorsExitBusOracle]:
      '0x8664d394C2B3278F26A1B44B967aEf99707eeAB2',
    [CSM_CONTRACT_NAMES.stakingRouter]:
      '0xCc820558B39ee15C7C45B59390B503b83fb499A8',
    [CSM_CONTRACT_NAMES.withdrawalVault]:
      '0x4473dCDDbf77679A643BdB654dbd86D67F8d32f2',
    [CSM_CONTRACT_NAMES.lidoRewardsVault]:
      '0x9b108015fe433F173696Af3Aa0CF7CDb3E104258',
    [CSM_CONTRACT_NAMES.stETH]: '0x3508A952176b3c15387C97BE809eaffB1982176a',
    [CSM_CONTRACT_NAMES.wstETH]: '0x7E99eE3C66636DE415D2d7C880938F2f40f94De4',
    [CSM_CONTRACT_NAMES.CSMSatellite]:
      '0x0124A201F2C867Aa40121c4Ac1b7E0C80baB2935',
  },
};

export const MODULE_ID_BY_CHAIN: { [key in CSM_SUPPORTED_CHAINS]: number } = {
  [CHAINS.Mainnet]: 3,
  [CHAINS.Hoodi]: 4,
};

export const DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN: {
  [key in CSM_SUPPORTED_CHAINS]: bigint;
} = {
  [CHAINS.Mainnet]: BigInt('0x13f7326'),
  [CHAINS.Hoodi]: BigInt('0x1374'),
};

export const SUPPORTED_VERSION_BY_CONTRACT = {
  [CSM_CONTRACT_NAMES.csAccounting]: [2n, 2n],
  [CSM_CONTRACT_NAMES.csFeeDistributor]: [2n, 2n],
  [CSM_CONTRACT_NAMES.csModule]: [2n, 2n],
  [CSM_CONTRACT_NAMES.csParametersRegistry]: [1n, 1n],
  [CSM_CONTRACT_NAMES.csStrikes]: [1n, 1n],
  [CSM_CONTRACT_NAMES.vettedGate]: [1n, 1n],
} as const;

export const PERCENT_BASIS = 10_000n;
