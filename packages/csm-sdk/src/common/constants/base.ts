import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';

import { Erc20Tokens } from '../tyles.js';
import { TOKENS } from './tokens.js';

export const CSM_SUPPORTED_CHAINS = [
  CHAINS.Mainnet,
  CHAINS.Hoodi,
  CHAINS.Holesky,
];
export type CSM_SUPPORTED_CHAINS =
  | CHAINS.Mainnet
  | CHAINS.Hoodi
  | CHAINS.Holesky;

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
}

export const CSM_CONTRACT_ADDRESSES: {
  [key in CSM_SUPPORTED_CHAINS]?: {
    [key2 in CSM_CONTRACT_NAMES | Erc20Tokens]?: Address;
  };
} = {
  [CHAINS.Mainnet]: {
    // [CSM_CONTRACT_NAMES.csEjector]: '0x',
    // [CSM_CONTRACT_NAMES.csParametersRegistry]: '0x',
    // [CSM_CONTRACT_NAMES.csStrikes]: '0x',
    // [CSM_CONTRACT_NAMES.permissionlessGate]: '0x',
    // [CSM_CONTRACT_NAMES.vettedGate]: '0x',
    // [CSM_CONTRACT_NAMES.csExitPenalties]: '0x',
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
    // [CSM_CONTRACT_NAMES.csEjector]: '0x',
    // [CSM_CONTRACT_NAMES.csExitPenalties]: '0x',
    // [CSM_CONTRACT_NAMES.csParametersRegistry]: '0x',
    // [CSM_CONTRACT_NAMES.csStrikes]: '0x',
    // [CSM_CONTRACT_NAMES.permissionlessGate]: '0x',
    // [CSM_CONTRACT_NAMES.vettedGate]: '0x',
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
  },
  [CHAINS.Holesky]: {
    [CSM_CONTRACT_NAMES.csAccounting]:
      '0xc093e53e8F4b55A223c18A2Da6fA00e60DD5EFE1',
    [CSM_CONTRACT_NAMES.csFeeDistributor]:
      '0xD7ba648C8F72669C6aE649648B516ec03D07c8ED',
    [CSM_CONTRACT_NAMES.csFeeOracle]:
      '0xaF57326C7d513085051b50912D51809ECC5d98Ee',
    [CSM_CONTRACT_NAMES.csModule]: '0x4562c3e63c2e586cD1651B958C22F88135aCAd4f',
    [CSM_CONTRACT_NAMES.hashConsensus]:
      '0xbF38618Ea09B503c1dED867156A0ea276Ca1AE37',
    [CSM_CONTRACT_NAMES.csEjector]:
      '0x477589D5A8cB67Bd6682AF3612f99ADB72d09582',
    [CSM_CONTRACT_NAMES.csExitPenalties]:
      '0xCF153E01322Ffd038737A25A2A139ECccF1A5bAD',
    [CSM_CONTRACT_NAMES.csParametersRegistry]:
      '0x25Cb2bA01849Ff577DD5223C4C8E46292cB15550',
    [CSM_CONTRACT_NAMES.csStrikes]:
      '0xa3806442E717308dc7FED0cb4d7b0de1F643546C',
    [CSM_CONTRACT_NAMES.permissionlessGate]:
      '0x676626c3940ae32eF1e4F609938F785fF064ee22',
    [CSM_CONTRACT_NAMES.vettedGate]:
      '0x92A5aB5e4f98e67Fb7295fe439A652d0E51033bf',
    [CSM_CONTRACT_NAMES.validatorsExitBusOracle]:
      '0xffDDF7025410412deaa05E3E1cE68FE53208afcb',
    [CSM_CONTRACT_NAMES.stakingRouter]:
      '0xd6EbF043D30A7fe46D1Db32BA90a0A51207FE229',
    [CSM_CONTRACT_NAMES.withdrawalVault]:
      '0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9',
    [CSM_CONTRACT_NAMES.lidoRewardsVault]:
      '0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8',
    [CSM_CONTRACT_NAMES.stETH]: '0x3F1c547b21f65e10480dE3ad8E19fAAC46C95034',
    [CSM_CONTRACT_NAMES.wstETH]: '0x8d09a4502Cc8Cf1547aD300E066060D043f6982D',
  },
};

export const MODULE_ID_BY_CHAIN: { [key in CHAINS]?: number } = {
  [CHAINS.Mainnet]: 3,
  [CHAINS.Hoodi]: 4,
  [CHAINS.Holesky]: 4,
};

export const DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN: { [key in CHAINS]?: bigint } = {
  [CHAINS.Mainnet]: BigInt('0x13f7326'),
  [CHAINS.Hoodi]: BigInt('0x1374'),
  [CHAINS.Holesky]: BigInt('0x1b143a'),
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
