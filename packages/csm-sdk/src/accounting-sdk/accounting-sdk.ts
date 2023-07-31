import { GetContractReturnType, WalletClient } from 'viem';
import { CSAccountingAbi } from '../abi/CSAccounting.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import { AmountByKeys } from './types.js';
import { TOKENS } from '../common/index.js';

export class AccountingSDK extends CsmSDKModule {
  protected get contract(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.core.getContractCSAccounting();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondAmountByKeysCountETH(keysCount: bigint, curveId: bigint) {
    return this.contract.read.getBondAmountByKeysCount([keysCount, curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondAmountByKeysCountWstETH(
    keysCount: bigint,
    curveId: bigint,
  ) {
    return this.contract.read.getBondAmountByKeysCountWstETH([
      keysCount,
      curveId,
    ]);
  }

  public async getBondAmountByKeysCountPerToken(
    keysCount: bigint,
    curveId: bigint,
  ): Promise<AmountByKeys> {
    const [eth, wsteth] = await Promise.all([
      this.getBondAmountByKeysCountETH(keysCount, curveId),
      this.getBondAmountByKeysCountWstETH(keysCount, curveId),
    ]);

    return {
      [TOKENS.eth]: eth,
      [TOKENS.steth]: eth,
      [TOKENS.wsteth]: wsteth,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getCurve(curveId: bigint) {
    return this.contract.read.getCurveInfo([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getKeysCountByBondAmount(curveId: bigint, amount: bigint) {
    return this.contract.read.getKeysCountByBondAmount([amount, curveId]);
  }
}
