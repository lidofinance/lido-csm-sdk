import {
  getEncodableContract,
  LidoSDKCore,
  type LidoSdkPublicClient,
  type LidoSdkWalletClient,
} from '@lidofinance/lido-ethereum-sdk';
import { Abi, Address, Chain, getContract } from 'viem';
import { BaseModuleAbi, VersionCheckAbi } from '../abi/index';
import { CsmSDKCacheable } from '../common/class-primitives/csm-sdk-cacheable';
import { Cache, Logger } from '../common/decorators/index';
import {
  API_NAME,
  API_URLS,
  CACHE_IMMUTABLE,
  CONTRACT_BASE_ABI,
  CONTRACT_NAMES,
  DEFAULT_IPFS_GATEWAYS,
  ERROR_CODE,
  invariant,
  MERKLE_TREE_FALLBACKS,
  MODULE_CONTRACT,
  MODULE_NAME,
  SUPPORTED_CHAINS,
  SUPPORTED_CONTRACT_VERSIONS,
} from '../common/index';
import { isValidIpfsCid, toCidV1Base32 } from '../common/utils/index';
import { onVersionError } from '../common/utils/on-error';
import {
  BindedContract,
  ContractAddresses,
  CoreProps,
  VersionCheckResult,
} from './types';

export class CoreSDK extends CsmSDKCacheable {
  private _cacheVersion = 0;

  get cacheVersion() {
    return this._cacheVersion;
  }

  readonly core: LidoSDKCore;
  readonly contractAddresses: ContractAddresses;
  readonly moduleId: bigint;
  readonly deploymentBlockNumber: bigint;
  readonly clApiUrl?: string;
  readonly keysApiUrl?: string;
  readonly feesMonitoringApiUrl?: string;
  readonly maxEventBlocksRange?: number;
  readonly skipHistoricalCalls: boolean;
  readonly moduleName: MODULE_NAME;
  readonly ipfsGateways: string[];

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
    this.ipfsGateways = props.ipfsGateways ?? [];
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

  public get publicClient(): LidoSdkPublicClient {
    return this.core.publicClient;
  }

  public get walletClient(): LidoSdkWalletClient {
    return this.core.useWalletClient();
  }

  public get moduleContract() {
    return MODULE_CONTRACT[this.moduleName];
  }

  @Logger('Utils:')
  @Cache(CACHE_IMMUTABLE)
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
  @Cache(CACHE_IMMUTABLE)
  public getContractWithAbi<TAbi extends Abi>(
    contractName: CONTRACT_NAMES,
    abi: TAbi,
  ): BindedContract<TAbi> {
    return getEncodableContract(
      getContract({
        address: this.getContractAddress(contractName),
        abi,
        client: this.core.keyedClient,
      }),
    ) as BindedContract<TAbi>;
  }

  public getContract<TName extends keyof typeof CONTRACT_BASE_ABI>(
    contractName: TName,
  ): BindedContract<(typeof CONTRACT_BASE_ABI)[TName]> {
    const abi = CONTRACT_BASE_ABI[contractName];
    return this.getContractWithAbi(contractName as any, abi as any) as any;
  }

  public get contractBaseModule(): BindedContract<typeof BaseModuleAbi> {
    return this.getContractWithAbi(this.moduleContract, BaseModuleAbi);
  }

  public get merkleTreeFallbacks() {
    return MERKLE_TREE_FALLBACKS[this.moduleName][this.chainId];
  }

  public get apiUrls() {
    return API_URLS[this.chainId];
  }

  public getMerkleTreeFallback(
    contractName: CONTRACT_NAMES,
  ): string | undefined {
    return this.merkleTreeFallbacks[contractName];
  }

  // `||` not `??`: env pipelines bake an unset var as '' (JSON.stringify keeps
  // '' but drops undefined), and an empty URL must fall back to the default.
  public get keysApiLink() {
    return this.keysApiUrl || this.apiUrls[API_NAME.keys];
  }

  public get feesMonitoringApiLink() {
    return this.feesMonitoringApiUrl || this.apiUrls[API_NAME.feesMonitoring];
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

  public invalidateCache() {
    this._cacheVersion++;
  }

  public getIpfsUrls(cid: string): string[] {
    if (!isValidIpfsCid(cid)) return [];

    // subdomain gateways can't carry base58 CIDv0 — DNS labels are case-insensitive
    const normalized = toCidV1Base32(cid);
    const gateways = [...this.ipfsGateways, ...DEFAULT_IPFS_GATEWAYS];

    return gateways.map((gateway) =>
      gateway.includes('{cid}')
        ? gateway.replace('{cid}', normalized)
        : `${gateway}${normalized}`,
    );
  }
}
