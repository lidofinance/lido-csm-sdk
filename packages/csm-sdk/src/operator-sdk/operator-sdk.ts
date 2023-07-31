import { GetContractReturnType, WalletClient } from 'viem';
import { CSAccountingAbi } from '../abi/CSAccounting.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import { BondBalance, NodeOperatorId } from '../common/index.js';
import { calcBondBalance } from '../common/utils/calc-bond-balance.js';
import { clearEmptyAddress } from '../common/utils/clear-empty-address.js';

export class OperatorSDK extends CsmSDKModule {
  protected get contract(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.core.getContractCSAccounting();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getCurveId(id: NodeOperatorId): Promise<bigint> {
    return this.contract.read.getBondCurveId([id]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondBalance(id: NodeOperatorId): Promise<BondBalance> {
    // TODO: promise.all
    const [current, required] = await this.contract.read.getBondSummary([id]);
    const locked = await this.contract.read.getActualLockedBond([id]);

    return calcBondBalance({ current, required, locked });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getNodeOperatoInfo(id: NodeOperatorId) {
    const csModule = this.core.getContractCSModule();
    const info = await csModule.read.getNodeOperator([id]);
    return {
      ...info,
      rewardsAddress: info.rewardAddress,
      proposedManagerAddress: clearEmptyAddress(info.proposedManagerAddress),
      proposedRewardsAddress: clearEmptyAddress(info.proposedRewardAddress),
    };
  }
}
