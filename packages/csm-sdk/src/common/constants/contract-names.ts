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
  metaRegistry = 'metaRegistry',
  curatedGate1 = 'curatedGate1',
  curatedGate2 = 'curatedGate2',
  curatedGate3 = 'curatedGate3',
  curatedGate4 = 'curatedGate4',
  curatedGate5 = 'curatedGate5',
  curatedGate6 = 'curatedGate6',
  curatedGate7 = 'curatedGate7',
  curatedGate8 = 'curatedGate8',
  curatedGate9 = 'curatedGate9',
}

export const CURATED_GATES = [
  CONTRACT_NAMES.curatedGate1,
  CONTRACT_NAMES.curatedGate2,
  CONTRACT_NAMES.curatedGate3,
  CONTRACT_NAMES.curatedGate4,
  CONTRACT_NAMES.curatedGate5,
  CONTRACT_NAMES.curatedGate6,
  CONTRACT_NAMES.curatedGate7,
  CONTRACT_NAMES.curatedGate8,
  CONTRACT_NAMES.curatedGate9,
] as const;

export type CURATED_GATES = (typeof CURATED_GATES)[number];
