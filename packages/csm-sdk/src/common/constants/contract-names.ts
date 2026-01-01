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

  // CM-specific
  curatedModule = 'curatedModule',
  curatedGate = 'curatedGate',
  operatorsData = 'operatorsData',
}
