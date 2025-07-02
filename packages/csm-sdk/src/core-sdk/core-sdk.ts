import {
  ERROR_CODE,
  invariant,
  LidoSDKCore,
  NOOP,
  TransactionOptions,
  TransactionResult,
  withSDKError,
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
  CSParametersRegistryAbi,
  CSStrikesAbi,
  HashConsensusAbi,
  PermissionlessGateAbi,
  StakingRouterAbi,
  ValidatorsExitBusOracleAbi,
  VettedGateAbi,
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
import {
  CSM_ADDRESSES,
  CsmCoreProps,
  PerformTransactionOptions,
  TransactionCallbackStage,
} from './types.js';

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

  public get client() {
    return this.core.rpcProvider;
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
      `CSM contracts are not supported for ${this.core.chain.name}(${this.core.chain.id})`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    return address;
  }

  public getContract<T extends Abi>(
    contractName: CSM_CONTRACT_NAMES,
    abi: T,
  ): GetContractReturnType<T, WalletClient> {
    return getContract({
      address: this.getContractAddress(contractName),
      abi,
      client: {
        public: this.core.rpcProvider,
        wallet: this.core.web3Provider as WalletClient,
      },
    });
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSAccounting(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csAccounting, CSAccountingAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSEjector(): GetContractReturnType<
    typeof CSEjectorAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csEjector, CSEjectorAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSFeeDistributor(): GetContractReturnType<
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
  public getContractCSFeeOracle(): GetContractReturnType<
    typeof CSFeeOracleAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csFeeOracle, CSFeeOracleAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSModule(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csModule, CSModuleAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSParametersRegistry(): GetContractReturnType<
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
  public getContractCSStrikes(): GetContractReturnType<
    typeof CSStrikesAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csStrikes, CSStrikesAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSExitPenalties(): GetContractReturnType<
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
  public getContractHashConsensus(): GetContractReturnType<
    typeof HashConsensusAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.hashConsensus, HashConsensusAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractPermissionlessGate(): GetContractReturnType<
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
  public getContractVettedGate(): GetContractReturnType<
    typeof VettedGateAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.vettedGate, VettedGateAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractStakingRouter(): GetContractReturnType<
    typeof StakingRouterAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.stakingRouter, StakingRouterAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractValidatorsExitBusOracle(): GetContractReturnType<
    typeof ValidatorsExitBusOracleAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.validatorsExitBusOracle,
      ValidatorsExitBusOracleAbi,
    );
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

  public getIpfsUrl(cid: string): string {
    return `https://ipfs.io/ipfs/${cid}`;
  }

  public async performTransaction<TDecodedResult = undefined>(
    props: PerformTransactionOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    // this guards against not having web3Provider
    this.core.useWeb3Provider();
    const {
      callback = NOOP,
      getGasLimit,
      sendTransaction,
      decodeResult,
      waitForTransactionReceiptParameters = {},
    } = props;
    const account = await this.core.useAccount(props.account);
    const isContract = await this.core.isContract(account.address);

    let overrides: TransactionOptions = {
      account,
      chain: this.core.chain,
      gas: undefined,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    };

    if (isContract) {
      // passing these stub params prevent unnecessary possibly errorish RPC calls
      overrides = {
        ...overrides,
        gas: 21000n,
        maxFeePerGas: 1n,
        maxPriorityFeePerGas: 1n,
        nonce: 1,
      };
    } else {
      await callback({ stage: TransactionCallbackStage.GAS_LIMIT });
      const feeData = await this.core.getFeeData();
      overrides.maxFeePerGas = feeData.maxFeePerGas;
      overrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      try {
        overrides.gas = await getGasLimit({ ...overrides });
      } catch {
        // we retry without fees to see if tx will go trough
        await withSDKError(
          getGasLimit({
            ...overrides,
            maxFeePerGas: undefined,
            maxPriorityFeePerGas: undefined,
          }),
          ERROR_CODE.TRANSACTION_ERROR,
        );
        throw this.core.error({
          code: ERROR_CODE.TRANSACTION_ERROR,
          message: 'Not enough ether for gas',
        });
      }
    }

    const customGas = await callback({
      stage: TransactionCallbackStage.SIGN,
      payload: { gas: overrides.gas },
    });

    if (typeof customGas === 'bigint') overrides.gas = customGas;

    const hash = await withSDKError(
      sendTransaction({
        ...overrides,
      }),
      ERROR_CODE.TRANSACTION_ERROR,
    );

    if (isContract) {
      await callback({ stage: TransactionCallbackStage.MULTISIG_DONE });
      return { hash };
    }

    await callback({
      stage: TransactionCallbackStage.RECEIPT,
      payload: { hash },
    });

    const receipt = await withSDKError(
      this.core.rpcProvider.waitForTransactionReceipt({
        hash,
        timeout: 120_000,
        ...waitForTransactionReceiptParameters,
      }),
      ERROR_CODE.TRANSACTION_ERROR,
    );

    await callback({
      stage: TransactionCallbackStage.CONFIRMATION,
      payload: { receipt, hash },
    });

    const confirmations =
      await this.core.rpcProvider.getTransactionConfirmations({
        hash: receipt.transactionHash,
      });

    const result = await decodeResult?.(receipt);

    await callback({
      stage: TransactionCallbackStage.DONE,
      payload: {
        result: result as Awaited<TDecodedResult>,
        confirmations,
        receipt,
        hash,
      },
    });

    return {
      hash,
      receipt,
      result,
      confirmations,
    };
  }
}
