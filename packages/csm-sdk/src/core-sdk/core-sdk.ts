import {
  ERROR_CODE,
  invariant,
  LidoSDKCore,
} from '@lidofinance/lido-ethereum-sdk';
import { Abi, Address, Chain, getContract, WalletClient } from 'viem';
import {
  AccountingAbi,
  BaseModuleAbi,
  CSModuleAbi,
  CSMSatelliteAbi,
  SMDiscoveryAbi,
  CuratedGateAbi,
  CuratedModuleAbi,
  EjectorAbi,
  ExitPenaltiesAbi,
  FeeDistributorAbi,
  FeeOracleAbi,
  HashConsensusAbi,
  OperatorsDataAbi,
  ParametersRegistryAbi,
  PermissionlessGateAbi,
  StakingRouterAbi,
  ValidatorsExitBusOracleAbi,
  ValidatorStrikesAbi,
  VerifierAbi,
  VettedGateAbi,
  WithdrawalVaultAbi,
} from '../abi/index.js';
import { CsmSDKCacheable } from '../common/class-primitives/csm-sdk-cacheable.js';
import { Cache, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CONTRACT_NAMES,
  Erc20Tokens,
  EXTERNAL_LINKS,
  LINK_TYPE,
  SUPPORTED_CHAINS,
} from '../common/index.js';
import {
  BindedContract,
  ContractAddresses,
  CoreProps,
  ModuleName,
} from './types.js';

export class CoreSDK extends CsmSDKCacheable {
  readonly core: LidoSDKCore;
  readonly contractAddresses: ContractAddresses;
  readonly moduleId: number;
  readonly deploymentBlockNumber: bigint;
  readonly clApiUrl?: string;
  readonly keysApiUrl?: string;
  readonly feesMonitoringApiUrl?: string;
  readonly maxEventBlocksRange?: number;
  readonly skipHistoricalCalls: boolean;
  readonly moduleName: ModuleName;

  constructor(props: CoreProps) {
    super();
    this.core = props.core;
    this.contractAddresses = props.contractAddresses;
    this.moduleId = props.moduleId;
    this.deploymentBlockNumber = props.deploymentBlockNumber ?? 0n;
    this.clApiUrl = props.clApiUrl;
    this.keysApiUrl = props.keysApiUrl;
    this.feesMonitoringApiUrl = props.feesMonitoringApiUrl;
    this.maxEventBlocksRange = props.maxEventBlocksRange;
    this.skipHistoricalCalls = props.skipHistoricalCalls ?? false;
    this.moduleName = props.moduleName ?? CONTRACT_NAMES.csModule;
  }

  public get chainId(): SUPPORTED_CHAINS {
    return this.core.chain.id as SUPPORTED_CHAINS;
  }

  public get chain(): Chain {
    return this.core.chain;
  }

  public get logMode() {
    return this.core.logMode;
  }

  public get publicClient() {
    return this.core.rpcProvider;
  }

  public get walletClient() {
    return this.core.useWeb3Provider();
  }

  @Logger('Utils:')
  @Cache(CACHE_LONG)
  public getContractAddress(contract: CONTRACT_NAMES | Erc20Tokens): Address {
    const address = this.contractAddresses[contract];
    invariant(
      address,
      `Contract [${contract}] not configured`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    return address;
  }

  public getContract<TAbi extends Abi>(
    contractName: CONTRACT_NAMES | Erc20Tokens,
    abi: TAbi,
  ): BindedContract<TAbi> {
    return getContract({
      address: this.getContractAddress(contractName),
      abi,
      client: {
        public: this.publicClient,
        wallet: this.core.web3Provider as WalletClient,
      },
    });
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractAccounting(): BindedContract<typeof AccountingAbi> {
    return this.getContract(CONTRACT_NAMES.accounting, AccountingAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractEjector(): BindedContract<typeof EjectorAbi> {
    return this.getContract(CONTRACT_NAMES.ejector, EjectorAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractFeeDistributor(): BindedContract<typeof FeeDistributorAbi> {
    return this.getContract(CONTRACT_NAMES.feeDistributor, FeeDistributorAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractFeeOracle(): BindedContract<typeof FeeOracleAbi> {
    return this.getContract(CONTRACT_NAMES.feeOracle, FeeOracleAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractCSModule(): BindedContract<typeof CSModuleAbi> {
    return this.getContract(CONTRACT_NAMES.csModule, CSModuleAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractParametersRegistry(): BindedContract<
    typeof ParametersRegistryAbi
  > {
    return this.getContract(
      CONTRACT_NAMES.parametersRegistry,
      ParametersRegistryAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractValidatorStrikes(): BindedContract<typeof ValidatorStrikesAbi> {
    return this.getContract(
      CONTRACT_NAMES.validatorStrikes,
      ValidatorStrikesAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractExitPenalties(): BindedContract<typeof ExitPenaltiesAbi> {
    return this.getContract(CONTRACT_NAMES.exitPenalties, ExitPenaltiesAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractVerifier(): BindedContract<typeof VerifierAbi> {
    return this.getContract(CONTRACT_NAMES.verifier, VerifierAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractHashConsensus(): BindedContract<typeof HashConsensusAbi> {
    return this.getContract(CONTRACT_NAMES.hashConsensus, HashConsensusAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractPermissionlessGate(): BindedContract<
    typeof PermissionlessGateAbi
  > {
    return this.getContract(
      CONTRACT_NAMES.permissionlessGate,
      PermissionlessGateAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractVettedGate(): BindedContract<typeof VettedGateAbi> {
    return this.getContract(CONTRACT_NAMES.vettedGate, VettedGateAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractStakingRouter(): BindedContract<typeof StakingRouterAbi> {
    return this.getContract(CONTRACT_NAMES.stakingRouter, StakingRouterAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractValidatorsExitBusOracle(): BindedContract<
    typeof ValidatorsExitBusOracleAbi
  > {
    return this.getContract(
      CONTRACT_NAMES.validatorsExitBusOracle,
      ValidatorsExitBusOracleAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractWithdrawalVault(): BindedContract<typeof WithdrawalVaultAbi> {
    return this.getContract(CONTRACT_NAMES.withdrawalVault, WithdrawalVaultAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractCSMSatellite(): BindedContract<typeof CSMSatelliteAbi> {
    return this.getContract(CONTRACT_NAMES.CSMSatellite, CSMSatelliteAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractSMDiscovery(): BindedContract<typeof SMDiscoveryAbi> {
    return this.getContract(CONTRACT_NAMES.SMDiscovery, SMDiscoveryAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractCuratedModule(): BindedContract<typeof CuratedModuleAbi> {
    return this.getContract(CONTRACT_NAMES.curatedModule, CuratedModuleAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractOperatorsData(): BindedContract<typeof OperatorsDataAbi> {
    return this.getContract(CONTRACT_NAMES.operatorsData, OperatorsDataAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractCuratedGate1(): BindedContract<typeof CuratedGateAbi> {
    return this.getContract(CONTRACT_NAMES.curatedGate1, CuratedGateAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractCuratedGate2(): BindedContract<typeof CuratedGateAbi> {
    return this.getContract(CONTRACT_NAMES.curatedGate2, CuratedGateAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractBaseModule(): BindedContract<typeof BaseModuleAbi> {
    return getContract({
      address: this.getContractAddress(this.moduleName),
      abi: BaseModuleAbi,
      client: {
        public: this.publicClient,
        wallet: this.core.web3Provider as WalletClient,
      },
    });
  }

  public get externalLinks() {
    return EXTERNAL_LINKS[this.chainId];
  }

  public getExternalLink(type: LINK_TYPE) {
    return this.externalLinks[type];
  }

  public get keysApiLink() {
    return this.keysApiUrl ?? this.getExternalLink(LINK_TYPE.keysApi);
  }

  public get rewardsTreeLink() {
    return this.getExternalLink(LINK_TYPE.rewardsTree);
  }

  public get icsTreeLink() {
    return this.getExternalLink(LINK_TYPE.icsTree);
  }

  public get curatedGateTreeLink() {
    return this.getExternalLink(LINK_TYPE.curatedGateTree);
  }

  public get feesMonitoringApiLink() {
    return (
      this.feesMonitoringApiUrl ??
      this.getExternalLink(LINK_TYPE.feesMonitoringApi)
    );
  }

  public getIpfsUrls(cid: string): string[] {
    return [
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
    ];
  }
}

