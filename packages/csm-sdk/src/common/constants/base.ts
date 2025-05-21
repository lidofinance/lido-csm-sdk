import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';

// FIXME: remove this
import { DEPLOY_DATA as dd } from './deploy.js';
import { TOKENS } from './tokens.js';
import { Erc20Tokens } from '../tyles.js';

export enum CSM_CONTRACT_NAMES {
  csAccounting = 'csAccounting',
  csEjector = 'csEjector',
  csFeeDistributor = 'csFeeDistributor',
  csFeeOracle = 'csFeeOracle',
  csModule = 'csModule',
  csParametersRegistry = 'csParametersRegistry',
  csStrikes = 'csStrikes',
  csVerifier = 'hashConsensus',
  hashConsensus = 'csVerifier',
  permissionlessGate = 'permissionlessGate',
  vettedGate = 'vettedGate',
  stakingRouter = 'stakingRouter',
  validatorsExitBusOracle = 'validatorsExitBusOracle',
}

export const CSM_CONTRACT_ADDRESSES: {
  [key in CHAINS]?: { [key2 in CSM_CONTRACT_NAMES]?: Address };
} = {
  [CHAINS.Mainnet]: {
    // [CSM_CONTRACT_NAMES.csAccounting]: '0x',
    // [CSM_CONTRACT_NAMES.csEjector]: '0x',
    // [CSM_CONTRACT_NAMES.csFeeDistributor]: '0x',
    // [CSM_CONTRACT_NAMES.csFeeOracle]: '0x',
    // [CSM_CONTRACT_NAMES.csModule]: '0x',
    // [CSM_CONTRACT_NAMES.csParametersRegistry]: '0x',
    // [CSM_CONTRACT_NAMES.csStrikes]: '0x',
    // [CSM_CONTRACT_NAMES.csVerifier]: '0x',
    // [CSM_CONTRACT_NAMES.hashConsensus]: '0x',
    // [CSM_CONTRACT_NAMES.permissionlessGate]: '0x',
    // [CSM_CONTRACT_NAMES.vettedGate]: '0x',
    [CSM_CONTRACT_NAMES.validatorsExitBusOracle]:
      '0x0De4Ea0184c2ad0BacA7183356Aea5B8d5Bf5c6e',
    [CSM_CONTRACT_NAMES.stakingRouter]:
      '0xFdDf38947aFB03C621C71b06C9C70bce73f12999',
  },
  [CHAINS.Hoodi]: {
    [CSM_CONTRACT_NAMES.csAccounting]: dd.CSAccounting,
    [CSM_CONTRACT_NAMES.csEjector]: dd.CSEjector,
    [CSM_CONTRACT_NAMES.csFeeDistributor]: dd.CSFeeDistributor,
    [CSM_CONTRACT_NAMES.csFeeOracle]: dd.CSFeeOracle,
    [CSM_CONTRACT_NAMES.csModule]: dd.CSModule,
    [CSM_CONTRACT_NAMES.csParametersRegistry]: dd.CSParametersRegistry,
    [CSM_CONTRACT_NAMES.csStrikes]: dd.CSStrikes,
    [CSM_CONTRACT_NAMES.csVerifier]: dd.CSVerifier,
    [CSM_CONTRACT_NAMES.hashConsensus]: dd.HashConsensus,
    [CSM_CONTRACT_NAMES.permissionlessGate]: dd.PermissionlessGate,
    [CSM_CONTRACT_NAMES.vettedGate]: dd.VettedGate,
    [CSM_CONTRACT_NAMES.validatorsExitBusOracle]:
      '0x8664d394C2B3278F26A1B44B967aEf99707eeAB2',
    [CSM_CONTRACT_NAMES.stakingRouter]:
      '0xCc820558B39ee15C7C45B59390B503b83fb499A8',
  },
};

export const MODULE_ID_BY_CHAIN: { [key in CHAINS]?: number } = {
  [CHAINS.Mainnet]: 3,
  [CHAINS.Hoodi]: 4,
};

export const WITHDRAWAL_CREDENTIALS_BY_CHAIN: { [key in CHAINS]?: Address } = {
  [CHAINS.Mainnet]: '0xB9D7934878B5FB9610B3fE8A5e441e8fad7E293f',
  [CHAINS.Hoodi]: '0x4473dCDDbf77679A643BdB654dbd86D67F8d32f2',
};

export const DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN: { [key in CHAINS]?: bigint } = {
  [CHAINS.Mainnet]: BigInt('0x13f7326'),
  [CHAINS.Hoodi]: BigInt('0x1374'),
};

export const SUPPORTED_VERSION_BY_CONTRACT = {
  [CSM_CONTRACT_NAMES.csAccounting]: 2n,
  [CSM_CONTRACT_NAMES.csFeeDistributor]: 2n,
  [CSM_CONTRACT_NAMES.csModule]: 2n,
} as const;

export const TOKEN_ADDRESS: {
  [key in CHAINS]?: { [key2 in Erc20Tokens]?: Address };
} = {
  [CHAINS.Mainnet]: {
    [TOKENS.steth]: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    [TOKENS.wsteth]: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  },
  [CHAINS.Hoodi]: {
    [TOKENS.steth]: '0x3508A952176b3c15387C97BE809eaffB1982176a',
    [TOKENS.wsteth]: '0x7E99eE3C66636DE415D2d7C880938F2f40f94De4',
  },
};

export const PERCENT_BASIS = 10_000n;
