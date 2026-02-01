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
  SMDiscovery = 'SMDiscovery',

  // CSM-specific
  csModule = 'csModule',
  permissionlessGate = 'permissionlessGate',
  vettedGate = 'vettedGate',

  // CM-specific
  curatedModule = 'curatedModule',
  operatorsData = 'operatorsData',
  curatedGate1 = 'curatedGate1',
}

export const CURATED_GATES = [CONTRACT_NAMES.curatedGate1] as const;

export type CURATED_GATES = (typeof CURATED_GATES)[number];
