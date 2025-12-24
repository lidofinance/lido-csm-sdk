import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';

import { Erc20Tokens } from '../types.js';
import { TOKENS } from './tokens.js';

export const CSM_SUPPORTED_CHAINS = [CHAINS.Mainnet, CHAINS.Hoodi];
export type CSM_SUPPORTED_CHAINS = CHAINS.Mainnet | CHAINS.Hoodi;

export enum CSM_CONTRACT_NAMES {
  csModule = 'csModule',
  accounting = 'accounting',
  ejector = 'ejector',
  exitPenalties = 'exitPenalties',
  feeDistributor = 'feeDistributor',
  feeOracle = 'feeOracle',
  parametersRegistry = 'parametersRegistry',
  validatorStrikes = 'validatorStrikes',
  verifier = 'verifier',
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

// TODO: less hardcoded way to get addresses
export const CSM_CONTRACT_ADDRESSES: {
  [key in CSM_SUPPORTED_CHAINS]?: {
    [key2 in CSM_CONTRACT_NAMES | Erc20Tokens]: Address;
  };
} = {
  [CHAINS.Mainnet]: {
    [CSM_CONTRACT_NAMES.csModule]: '0xdA7dE2ECdDfccC6c3AF10108Db212ACBBf9EA83F',
    [CSM_CONTRACT_NAMES.accounting]:
      '0x4d72BFF1BeaC69925F8Bd12526a39BAAb069e5Da',
    [CSM_CONTRACT_NAMES.ejector]: '0xc72b58aa02E0e98cF8A4a0E9Dce75e763800802C',
    [CSM_CONTRACT_NAMES.exitPenalties]:
      '0x06cd61045f958A209a0f8D746e103eCc625f4193',
    [CSM_CONTRACT_NAMES.feeDistributor]:
      '0xD99CC66fEC647E68294C6477B40fC7E0F6F618D0',
    [CSM_CONTRACT_NAMES.feeOracle]:
      '0x4D4074628678Bd302921c20573EEa1ed38DdF7FB',
    [CSM_CONTRACT_NAMES.parametersRegistry]:
      '0x9D28ad303C90DF524BA960d7a2DAC56DcC31e428',
    [CSM_CONTRACT_NAMES.validatorStrikes]:
      '0xaa328816027F2D32B9F56d190BC9Fa4A5C07637f',
    [CSM_CONTRACT_NAMES.verifier]: '0xdC5FE1782B6943f318E05230d688713a560063DC',
    [CSM_CONTRACT_NAMES.hashConsensus]:
      '0x71093efF8D8599b5fA340D665Ad60fA7C80688e4',
    [CSM_CONTRACT_NAMES.permissionlessGate]:
      '0xcF33a38111d0B1246A3F38a838fb41D626B454f0',
    [CSM_CONTRACT_NAMES.vettedGate]:
      '0xB314D4A76C457c93150d308787939063F4Cc67E0',
    [CSM_CONTRACT_NAMES.stakingRouter]:
      '0xFdDf38947aFB03C621C71b06C9C70bce73f12999',
    [CSM_CONTRACT_NAMES.validatorsExitBusOracle]:
      '0x0De4Ea0184c2ad0BacA7183356Aea5B8d5Bf5c6e',
    [CSM_CONTRACT_NAMES.withdrawalVault]:
      '0xB9D7934878B5FB9610B3fE8A5e441e8fad7E293f',
    [CSM_CONTRACT_NAMES.lidoRewardsVault]:
      '0x388C818CA8B9251b393131C08a736A67ccB19297',
    [CSM_CONTRACT_NAMES.stETH]: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    [CSM_CONTRACT_NAMES.wstETH]: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    [CSM_CONTRACT_NAMES.CSMSatellite]:
      '0xf1199B61429E16e5c9F1a3f73A1190b52Bc81ddc',
  },
  [CHAINS.Hoodi]: {
    [CSM_CONTRACT_NAMES.csModule]: '0x79CEf36D84743222f37765204Bec41E92a93E59d',
    [CSM_CONTRACT_NAMES.accounting]:
      '0xA54b90BA34C5f326BC1485054080994e38FB4C60',
    [CSM_CONTRACT_NAMES.ejector]: '0x777bd76326E4aDcD353b03AD45b33BAF41048476',
    [CSM_CONTRACT_NAMES.exitPenalties]:
      '0xD259b31083Be841E5C85b2D481Cfc17C14276800',
    [CSM_CONTRACT_NAMES.feeDistributor]:
      '0xaCd9820b0A2229a82dc1A0770307ce5522FF3582',
    [CSM_CONTRACT_NAMES.feeOracle]:
      '0xe7314f561B2e72f9543F1004e741bab6Fc51028B',
    [CSM_CONTRACT_NAMES.parametersRegistry]:
      '0xA4aD5236963f9Fe4229864712269D8d79B65C5Ad',
    [CSM_CONTRACT_NAMES.validatorStrikes]:
      '0x8fBA385C3c334D251eE413e79d4D3890db98693c',
    [CSM_CONTRACT_NAMES.verifier]: '0x1773b2Ff99A030F6000554Cb8A5Ec93145650cbA',
    [CSM_CONTRACT_NAMES.hashConsensus]:
      '0x54f74a10e4397dDeF85C4854d9dfcA129D72C637',
    [CSM_CONTRACT_NAMES.permissionlessGate]:
      '0x5553077102322689876A6AdFd48D75014c28acfb',
    [CSM_CONTRACT_NAMES.vettedGate]:
      '0x10a254E724fe2b7f305F76f3F116a3969c53845f',
    [CSM_CONTRACT_NAMES.stakingRouter]:
      '0xCc820558B39ee15C7C45B59390B503b83fb499A8',
    [CSM_CONTRACT_NAMES.validatorsExitBusOracle]:
      '0x8664d394C2B3278F26A1B44B967aEf99707eeAB2',
    [CSM_CONTRACT_NAMES.withdrawalVault]:
      '0x4473dCDDbf77679A643BdB654dbd86D67F8d32f2',
    [CSM_CONTRACT_NAMES.lidoRewardsVault]:
      '0x9b108015fe433F173696Af3Aa0CF7CDb3E104258',
    [CSM_CONTRACT_NAMES.stETH]: '0x3508A952176b3c15387C97BE809eaffB1982176a',
    [CSM_CONTRACT_NAMES.wstETH]: '0x7E99eE3C66636DE415D2d7C880938F2f40f94De4',
    [CSM_CONTRACT_NAMES.CSMSatellite]:
      '0x3A981c53C16C03D6d58A9b1199C77752dE7BC956',
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
  [CSM_CONTRACT_NAMES.accounting]: [2n, 2n],
  [CSM_CONTRACT_NAMES.feeDistributor]: [2n, 2n],
  [CSM_CONTRACT_NAMES.csModule]: [2n, 2n],
  [CSM_CONTRACT_NAMES.parametersRegistry]: [1n, 1n],
  [CSM_CONTRACT_NAMES.validatorStrikes]: [1n, 1n],
  [CSM_CONTRACT_NAMES.vettedGate]: [1n, 1n],
  // Note: Verifier doesn't have getInitializedVersion method
} as const;

export const PERCENT_BASIS = 10_000n;

export const DEFAULT_CLEAN_MAX_ITEMS = 1000;

export const MAX_BLOCKS_DEPTH_TWO_WEEKS = 100_000n;
