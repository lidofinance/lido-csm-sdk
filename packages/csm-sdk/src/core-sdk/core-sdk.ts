import {
  ERROR_CODE,
  invariant,
  LidoSDKCore,
} from '@lidofinance/lido-ethereum-sdk';
import {
  Abi,
  Address,
  Chain,
  getContract,
  GetContractReturnType,
  WalletClient,
} from 'viem';
import {
  AccountingAbi,
  EjectorAbi,
  ExitPenaltiesAbi,
  FeeDistributorAbi,
  FeeOracleAbi,
  CSModuleAbi,
  CSMSatelliteAbi,
  ParametersRegistryAbi,
  ValidatorStrikesAbi,
  VerifierAbi,
  HashConsensusAbi,
  PermissionlessGateAbi,
  StakingRouterAbi,
  ValidatorsExitBusOracleAbi,
  VettedGateAbi,
  WithdrawalVaultAbi,
} from '../abi/index.js';
import { CsmSDKCacheable } from '../common/class-primitives/csm-sdk-cacheable.js';
import { Cache, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CSM_CONTRACT_ADDRESSES,
  CSM_CONTRACT_NAMES,
  CSM_SUPPORTED_CHAINS,
  DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN,
  Erc20Tokens,
  EXTERNAL_LINKS,
  LINK_TYPE,
  MODULE_ID_BY_CHAIN,
} from '../common/index.js';
import { CSM_ADDRESSES, CsmCoreProps } from './types.js';

export class CoreSDK extends CsmSDKCacheable {
  readonly core: LidoSDKCore;
  readonly overridedAddresses?: CSM_ADDRESSES;
  readonly clApiUrl?: string;
  readonly keysApiUrl?: string;
  readonly feesMonitoringApiUrl?: string;
  readonly maxEventBlocksRange?: number;
  readonly skipHistoricalCalls: boolean;

  constructor(props: CsmCoreProps) {
    super();
    this.core = props.core;
    this.overridedAddresses = props.overridedAddresses;
    this.clApiUrl = props.clApiUrl;
    this.keysApiUrl = props.keysApiUrl;
    this.feesMonitoringApiUrl = props.feesMonitoringApiUrl;
    this.maxEventBlocksRange = props.maxEventBlocksRange;
    this.skipHistoricalCalls = props.skipHistoricalCalls ?? false;
  }

  public get chainId(): CSM_SUPPORTED_CHAINS {
    return this.core.chain.id as CSM_SUPPORTED_CHAINS;
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
  public getContractAddress(
    contract: CSM_CONTRACT_NAMES | Erc20Tokens,
  ): Address {
    const address =
      this.overridedAddresses?.[contract] ??
      CSM_CONTRACT_ADDRESSES[this.chainId]?.[contract];
    invariant(
      address,
      `CSM contract [${contract}] are not supported for ${this.core.chain.name}(${this.core.chain.id})`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    return address;
  }

  public getContract<TAbi extends Abi>(
    contractName: CSM_CONTRACT_NAMES | Erc20Tokens,
    abi: TAbi,
  ): GetContractReturnType<TAbi, WalletClient> {
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
  get contractAccounting(): GetContractReturnType<
    typeof AccountingAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.accounting, AccountingAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractEjector(): GetContractReturnType<
    typeof EjectorAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.ejector, EjectorAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractFeeDistributor(): GetContractReturnType<
    typeof FeeDistributorAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.feeDistributor,
      FeeDistributorAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractFeeOracle(): GetContractReturnType<
    typeof FeeOracleAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.feeOracle, FeeOracleAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractCSModule(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csModule, CSModuleAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractParametersRegistry(): GetContractReturnType<
    typeof ParametersRegistryAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.parametersRegistry,
      ParametersRegistryAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractValidatorStrikes(): GetContractReturnType<
    typeof ValidatorStrikesAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.validatorStrikes, ValidatorStrikesAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractExitPenalties(): GetContractReturnType<
    typeof ExitPenaltiesAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.exitPenalties,
      ExitPenaltiesAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractVerifier(): GetContractReturnType<
    typeof VerifierAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.verifier, VerifierAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractHashConsensus(): GetContractReturnType<
    typeof HashConsensusAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.hashConsensus, HashConsensusAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractPermissionlessGate(): GetContractReturnType<
    typeof PermissionlessGateAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.permissionlessGate,
      PermissionlessGateAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractVettedGate(): GetContractReturnType<
    typeof VettedGateAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.vettedGate, VettedGateAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractStakingRouter(): GetContractReturnType<
    typeof StakingRouterAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.stakingRouter, StakingRouterAbi);
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractValidatorsExitBusOracle(): GetContractReturnType<
    typeof ValidatorsExitBusOracleAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.validatorsExitBusOracle,
      ValidatorsExitBusOracleAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractWithdrawalVault(): GetContractReturnType<
    typeof WithdrawalVaultAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.withdrawalVault,
      WithdrawalVaultAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  get contractCSMSatellite(): GetContractReturnType<
    typeof CSMSatelliteAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.CSMSatellite, CSMSatelliteAbi);
  }

  public get moduleId(): number {
    return MODULE_ID_BY_CHAIN[this.chainId];
  }

  public get deploymentBlockNumber(): bigint {
    return DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN[this.chainId];
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

  public get feesMonitoringApiLink() {
    return this.feesMonitoringApiUrl ?? this.getExternalLink(LINK_TYPE.feesMonitoringApi);
  }

  public getIpfsUrls(cid: string): string[] {
    return [
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
    ];
  }
}
