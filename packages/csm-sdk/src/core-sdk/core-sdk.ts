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
  CSAccountingAbi,
  CSEjectorAbi,
  CSExitPenaltiesAbi,
  CSFeeDistributorAbi,
  CSFeeOracleAbi,
  CSModuleAbi,
  CSMSatelliteAbi,
  CSParametersRegistryAbi,
  CSStrikesAbi,
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
  readonly maxEventBlocksRange?: number;

  constructor(props: CsmCoreProps) {
    super();
    this.core = props.core;
    this.overridedAddresses = props.overridedAddresses;
    this.clApiUrl = props.clApiUrl;
    this.maxEventBlocksRange = props.maxEventBlocksRange;
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
  @Cache(30 * 60 * 1000)
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
  @Cache(30 * 60 * 1000)
  get contractCSAccounting(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csAccounting, CSAccountingAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  get contractCSEjector(): GetContractReturnType<
    typeof CSEjectorAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csEjector, CSEjectorAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  get contractCSFeeDistributor(): GetContractReturnType<
    typeof CSFeeDistributorAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.csFeeDistributor,
      CSFeeDistributorAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  get contractCSFeeOracle(): GetContractReturnType<
    typeof CSFeeOracleAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csFeeOracle, CSFeeOracleAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  get contractCSModule(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csModule, CSModuleAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  get contractCSParametersRegistry(): GetContractReturnType<
    typeof CSParametersRegistryAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.csParametersRegistry,
      CSParametersRegistryAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  get contractCSStrikes(): GetContractReturnType<
    typeof CSStrikesAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csStrikes, CSStrikesAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  get contractCSExitPenalties(): GetContractReturnType<
    typeof CSExitPenaltiesAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.csExitPenalties,
      CSExitPenaltiesAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  get contractHashConsensus(): GetContractReturnType<
    typeof HashConsensusAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.hashConsensus, HashConsensusAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
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
  @Cache(30 * 60 * 1000)
  get contractVettedGate(): GetContractReturnType<
    typeof VettedGateAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.vettedGate, VettedGateAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  get contractStakingRouter(): GetContractReturnType<
    typeof StakingRouterAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.stakingRouter, StakingRouterAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
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
  @Cache(30 * 60 * 1000)
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
  @Cache(30 * 60 * 1000)
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
    return this.getExternalLink(LINK_TYPE.keysApi);
  }

  public get rewardsTreeLink() {
    return this.getExternalLink(LINK_TYPE.rewardsTree);
  }

  public get icsTreeLink() {
    return this.getExternalLink(LINK_TYPE.icsTree);
  }

  public get feeMonitoringApiLink() {
    return this.getExternalLink(LINK_TYPE.feeMonitoringApi);
  }

  public getIpfsUrls(cid: string): string[] {
    return [
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
    ];
  }
}
