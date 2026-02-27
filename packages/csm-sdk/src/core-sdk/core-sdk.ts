import {
  ERROR_CODE,
  invariant,
  LidoSDKCore,
} from '@lidofinance/lido-ethereum-sdk';
import { Abi, Address, Chain, getContract, Hex, WalletClient } from 'viem';
import { BaseModuleAbi, VersionCheckAbi } from '../abi/index.js';
import { CsmSDKCacheable } from '../common/class-primitives/csm-sdk-cacheable.js';
import { Cache, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CONTRACT_BASE_ABI,
  CONTRACT_NAMES,
  EXTERNAL_LINKS,
  LINK_TYPE,
  MODULE_CONTRACT,
  MODULE_NAME,
  SUPPORTED_CHAINS,
  SUPPORTED_CONTRACT_VERSIONS,
} from '../common/index.js';
import { isValidIpfsCid } from '../common/utils/index.js';
import { onVersionError } from '../common/utils/on-error.js';
import {
  BindedContract,
  ContractAddresses,
  CoreProps,
  VersionCheckResult,
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
  readonly moduleName: MODULE_NAME;
  readonly wcPrefix: Hex;

  constructor(props: CoreProps) {
    super();
    this.core = props.core;
    this.contractAddresses = props.contractAddresses;
    this.moduleId = props.moduleId;
    this.clApiUrl = props.clApiUrl;
    this.keysApiUrl = props.keysApiUrl;
    this.feesMonitoringApiUrl = props.feesMonitoringApiUrl;
    this.maxEventBlocksRange = props.maxEventBlocksRange;
    this.deploymentBlockNumber = props.deploymentBlockNumber ?? 0n;
    this.skipHistoricalCalls = props.skipHistoricalCalls ?? false;
    this.moduleName = props.moduleName ?? MODULE_NAME.CSM;
    this.wcPrefix = props.wcPrefix ?? '0x01';
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
  public getContractAddress(contract: CONTRACT_NAMES): Address {
    const address = this.contractAddresses[contract];
    invariant(
      address,
      `Contract [${contract}] not configured`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    return address;
  }

  @Logger('Utils:')
  public getContractNameByAddress(
    address: Address,
  ): CONTRACT_NAMES | undefined {
    const normalizedAddress = address.toLowerCase();
    return Object.entries(this.contractAddresses).find(
      ([_, addr]) => addr?.toLowerCase() === normalizedAddress,
    )?.[0] as CONTRACT_NAMES | undefined;
  }

  @Logger('Contracts:')
  @Cache(CACHE_LONG)
  public getContractWithAbi<TAbi extends Abi>(
    contractName: CONTRACT_NAMES,
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

  public getContract<TName extends keyof typeof CONTRACT_BASE_ABI>(
    contractName: TName,
  ): BindedContract<(typeof CONTRACT_BASE_ABI)[TName]> {
    const abi = CONTRACT_BASE_ABI[contractName];
    return this.getContractWithAbi(contractName as any, abi as any) as any;
  }

  get contractBaseModule(): BindedContract<typeof BaseModuleAbi> {
    const contractName = MODULE_CONTRACT[this.moduleName];
    return this.getContractWithAbi(contractName, BaseModuleAbi);
  }

  public get externalLinks() {
    return EXTERNAL_LINKS[this.chainId];
  }

  private getExternalLink(type: LINK_TYPE) {
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

  @Logger('Utils:')
  public async checkContractVersion(
    contractName: CONTRACT_NAMES,
  ): Promise<VersionCheckResult> {
    const versionRange = SUPPORTED_CONTRACT_VERSIONS[contractName];
    if (!versionRange) {
      return { version: 0n, supported: true };
    }

    let actualVersion: bigint;
    try {
      actualVersion = await this.getContractWithAbi(
        contractName,
        VersionCheckAbi,
      ).read.getInitializedVersion();
    } catch (error) {
      actualVersion = onVersionError(error);
    }

    const [min, max] = versionRange;
    return {
      version: actualVersion,
      supported: actualVersion >= min && actualVersion <= max,
    };
  }

  public getIpfsUrls(cid: string): string[] {
    if (!isValidIpfsCid(cid)) return [];

    return [
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
    ];
  }
}
