import { TOKENS } from './tokens';

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
  smDiscovery = 'smDiscovery',

  // CSM-specific
  csModule = 'csModule',
  permissionlessGate = 'permissionlessGate',
  vettedGate = 'vettedGate',

  // CM-specific
  curatedModule = 'curatedModule',
  metaRegistry = 'metaRegistry',
  curatedGatePTO = 'curatedGatePTO',
  curatedGatePO = 'curatedGatePO',
  curatedGatePGO = 'curatedGatePGO',
  curatedGateDO = 'curatedGateDO',
  curatedGateMODC = 'curatedGateMODC',
  curatedGateIODC = 'curatedGateIODC',
  curatedGateIODCP = 'curatedGateIODCP',
}

export const CURATED_GATES = [
  CONTRACT_NAMES.curatedGatePO,
  CONTRACT_NAMES.curatedGatePTO,
  CONTRACT_NAMES.curatedGatePGO,
  CONTRACT_NAMES.curatedGateDO,
  CONTRACT_NAMES.curatedGateMODC,
  CONTRACT_NAMES.curatedGateIODC,
  CONTRACT_NAMES.curatedGateIODCP,
] as const;

export type CURATED_GATES = (typeof CURATED_GATES)[number];

export const SUPPORTED_CONTRACT_VERSIONS: Partial<
  Record<CONTRACT_NAMES, readonly [min: bigint, max: bigint]>
> = {
  [CONTRACT_NAMES.accounting]: [3n, 3n],
  [CONTRACT_NAMES.feeDistributor]: [3n, 3n],
  [CONTRACT_NAMES.parametersRegistry]: [1n, 1n],
  [CONTRACT_NAMES.validatorStrikes]: [1n, 1n],
  [CONTRACT_NAMES.csModule]: [3n, 3n],
  [CONTRACT_NAMES.vettedGate]: [1n, 1n],
  [CONTRACT_NAMES.curatedModule]: [1n, 1n],
};
