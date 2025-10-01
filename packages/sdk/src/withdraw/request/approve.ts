import { encodeFunctionData } from 'viem';

import type {
  NoTxOptions,
  PopulatedTransaction,
  TransactionOptions,
  TransactionResult,
} from '../../core/types.js';
import { NOOP } from '../../common/constants.js';
import { parseValue } from '../../common/utils/parse-value.js';
import { Logger, Cache, ErrorHandler } from '../../common/decorators/index.js';

import type {
  CheckAllowanceProps,
  CheckAllowanceResult,
  GetAllowanceProps,
  WithdrawApproveProps,
} from './types.js';
import { BusModule } from '../bus-module.js';

export class LidoSDKWithdrawApprove extends BusModule {
  @Logger('Call:')
  @ErrorHandler()
  public async approve(
    props: WithdrawApproveProps,
  ): Promise<TransactionResult> {
    this.bus.core.useWeb3Provider();
    const { account, token, callback = NOOP, amount: _amount, ...rest } = props;
    const amount = parseValue(_amount);
    const addressWithdrawalsQueue =
      await this.bus.contract.contractAddressWithdrawalQueue();

    const isSteth = token === 'stETH';

    // typing is wonky so we cast steth contract as interfaces are the same
    const contract = (
      isSteth
        ? await this.bus.contract.getContractStETH()
        : await this.bus.contract.getContractWstETH()
    ) as Awaited<ReturnType<typeof this.bus.contract.getContractStETH>>;

    return this.bus.core.performTransaction({
      ...rest,
      account,
      callback,
      getGasLimit: (options) =>
        contract.estimateGas.approve(
          [addressWithdrawalsQueue, amount],
          options,
        ),
      sendTransaction: (options) =>
        contract.write.approve([addressWithdrawalsQueue, amount], options),
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async approveSimulateTx(props: NoTxOptions<WithdrawApproveProps>) {
    const account = await this.bus.core.useAccount(props.account);
    const { token, amount: _amount } = props;
    const amount = parseValue(_amount);
    const isSteth = token === 'stETH';
    const addressWithdrawalsQueue =
      await this.bus.contract.contractAddressWithdrawalQueue();

    const contract = (
      isSteth
        ? await this.bus.contract.getContractStETH()
        : await this.bus.contract.getContractWstETH()
    ) as Awaited<ReturnType<typeof this.bus.contract.getContractStETH>>;

    const result = contract.simulate.approve(
      [addressWithdrawalsQueue, amount],
      { account },
    );

    return result;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async approvePopulateTx(
    props: NoTxOptions<WithdrawApproveProps>,
  ): Promise<PopulatedTransaction> {
    const { token, amount: _amount } = props;
    const account = await this.bus.core.useAccount(props.account);
    const amount = parseValue(_amount);
    const isSteth = token === 'stETH';

    const addressWithdrawalsQueue =
      await this.bus.contract.contractAddressWithdrawalQueue();
    const contract = (
      isSteth
        ? await this.bus.contract.getContractStETH()
        : await this.bus.contract.getContractWstETH()
    ) as Awaited<ReturnType<typeof this.bus.contract.getContractStETH>>;

    return {
      from: account.address,
      to: contract.address,
      data: encodeFunctionData({
        abi: contract.abi,
        functionName: 'approve',
        args: [addressWithdrawalsQueue, amount],
      }),
    };
  }

  // Utils

  @Logger('Utils:')
  @Cache(30 * 1000, ['bus.core.chain.id'])
  public async approveGasLimit(
    {
      account: accountProp,
      token,
      amount,
    }: Required<NoTxOptions<WithdrawApproveProps>>,
    options?: TransactionOptions,
  ): Promise<bigint> {
    const account = await this.bus.core.useAccount(accountProp);
    const value = parseValue(amount);
    const isSteth = token === 'stETH';
    let estimateGasMethod;

    if (isSteth)
      estimateGasMethod = (await this.bus.contract.getContractStETH())
        .estimateGas.approve;
    else
      estimateGasMethod = (await this.bus.contract.getContractWstETH())
        .estimateGas.approve;

    const addressWithdrawalsQueue =
      await this.bus.contract.contractAddressWithdrawalQueue();

    const gasLimit = await estimateGasMethod.call(
      this,
      [addressWithdrawalsQueue, value],
      { account, ...options },
    );

    return gasLimit;
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async getAllowance({
    account: accountProp,
    token,
  }: GetAllowanceProps): Promise<bigint> {
    const account = await this.bus.core.useAccount(accountProp);
    const isSteth = token === 'stETH';
    let allowanceMethod;

    if (isSteth)
      allowanceMethod = (await this.bus.contract.getContractStETH()).read
        .allowance;
    else
      allowanceMethod = (await this.bus.contract.getContractWstETH()).read
        .allowance;

    const addressWithdrawalsQueue =
      await this.bus.contract.contractAddressWithdrawalQueue();

    const allowance = await allowanceMethod.call(
      this,
      [account.address, addressWithdrawalsQueue],
      { account },
    );

    return allowance;
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async checkAllowance({
    amount: _amount,
    account: accountProp,
    token,
  }: CheckAllowanceProps): Promise<CheckAllowanceResult> {
    const account = await this.bus.core.useAccount(accountProp);
    const amount = parseValue(_amount);
    const isSteth = token === 'stETH';
    let allowanceMethod;

    if (isSteth)
      allowanceMethod = (await this.bus.contract.getContractStETH()).read
        .allowance;
    else
      allowanceMethod = (await this.bus.contract.getContractWstETH()).read
        .allowance;

    const addressWithdrawalsQueue =
      await this.bus.contract.contractAddressWithdrawalQueue();

    const allowance = await allowanceMethod.call(
      this,
      [account.address, addressWithdrawalsQueue],
      { account },
    );
    const needsApprove = allowance < amount;

    return { allowance, needsApprove };
  }
}
