import { TOKENS } from './tokens.js';

export enum CONTRACT_NAMES {
  // Common Lido contracts
  stakingRouter = 'stakingRouter',
  validatorsExitBusOracle = 'validatorsExitBusOracle',
  withdrawalVault = 'withdrawalVault',
  lidoRewardsVault = 'lidoRewardsVault',
  stETH = TOKENS.steth,
  wstETH = TOKENS.wsteth,

  // Module contracts (used by both CSM and CM)
  accounting = 'accounting',
  ejector = 'ejector',
  exitPenalties = 'exitPenalties',
  feeDistributor = 'feeDistributor',
  feeOracle = 'feeOracle',
  parametersRegistry = 'parametersRegistry',
  validatorStrikes = 'validatorStrikes',
  verifier = 'verifier',
  hashConsensus = 'hashConsensus',

  // CSM-specific
  csModule = 'csModule',
  permissionlessGate = 'permissionlessGate',
  vettedGate = 'vettedGate',
  CSMSatellite = 'CSMSatellite',
  SMDiscovery = 'SMDiscovery',

  // CM-specific
  curatedModule = 'curatedModule',
  operatorsData = 'operatorsData',
  curatedGate1 = 'curatedGate1',
  curatedGate2 = 'curatedGate2',
}

export const SUPPORTED_CONTRACT_VERSIONS = {
  [CONTRACT_NAMES.accounting]: [3n, 3n],
  [CONTRACT_NAMES.feeDistributor]: [3n, 3n],
  [CONTRACT_NAMES.feeOracle]: [3n, 3n],
  [CONTRACT_NAMES.csModule]: [3n, 3n],
  [CONTRACT_NAMES.curatedModule]: [1n, 1n],
  [CONTRACT_NAMES.parametersRegistry]: [1n, 1n],
  [CONTRACT_NAMES.validatorStrikes]: [1n, 1n],
  [CONTRACT_NAMES.vettedGate]: [1n, 1n],
} as const;

export const CuratedGates = [
  CONTRACT_NAMES.curatedGate1,
  CONTRACT_NAMES.curatedGate2,
];
