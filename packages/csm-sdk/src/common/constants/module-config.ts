import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';

import { CONTRACT_NAMES } from './contract-names';
import { MODULE_NAME, PerModule } from './module-name';
import { PerSupportedChain } from './supported-chains';

type ContractAddressMap = { [key in CONTRACT_NAMES]?: Address };

type ModuleChainConfig = {
  contractAddresses: ContractAddressMap;
  moduleId: bigint;
  deploymentBlockNumber?: bigint;
};

export type ModuleConfig = Partial<PerSupportedChain<ModuleChainConfig>>;

export const COMMON_ADDRESSES: PerSupportedChain<ContractAddressMap> = {
  [CHAINS.Mainnet]: {
    [CONTRACT_NAMES.stakingRouter]:
      '0xFdDf38947aFB03C621C71b06C9C70bce73f12999',
    [CONTRACT_NAMES.validatorsExitBusOracle]:
      '0x0De4Ea0184c2ad0BacA7183356Aea5B8d5Bf5c6e',
    [CONTRACT_NAMES.withdrawalVault]:
      '0xB9D7934878B5FB9610B3fE8A5e441e8fad7E293f',
    [CONTRACT_NAMES.lidoRewardsVault]:
      '0x388C818CA8B9251b393131C08a736A67ccB19297',
    [CONTRACT_NAMES.stETH]: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    [CONTRACT_NAMES.wstETH]: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    [CONTRACT_NAMES.smDiscovery]: '0x106b2E4506f3b3D0A6Dfb41bCB4A64C10Fe32b92',
  },
  [CHAINS.Hoodi]: {
    [CONTRACT_NAMES.stakingRouter]:
      '0xCc820558B39ee15C7C45B59390B503b83fb499A8',
    [CONTRACT_NAMES.validatorsExitBusOracle]:
      '0x8664d394C2B3278F26A1B44B967aEf99707eeAB2',
    [CONTRACT_NAMES.withdrawalVault]:
      '0x4473dCDDbf77679A643BdB654dbd86D67F8d32f2',
    [CONTRACT_NAMES.lidoRewardsVault]:
      '0x9b108015fe433F173696Af3Aa0CF7CDb3E104258',
    [CONTRACT_NAMES.stETH]: '0x3508A952176b3c15387C97BE809eaffB1982176a',
    [CONTRACT_NAMES.wstETH]: '0x7E99eE3C66636DE415D2d7C880938F2f40f94De4',
    [CONTRACT_NAMES.smDiscovery]: '0x9f869227c456feD9A50e272224E438b0e79c6387',
  },
};

export const MODULE_CONFIG: PerModule<ModuleConfig> = {
  [MODULE_NAME.CSM]: {
    [CHAINS.Mainnet]: {
      contractAddresses: {
        [CONTRACT_NAMES.csModule]: '0xdA7dE2ECdDfccC6c3AF10108Db212ACBBf9EA83F',
        [CONTRACT_NAMES.accounting]:
          '0x4d72BFF1BeaC69925F8Bd12526a39BAAb069e5Da',
        [CONTRACT_NAMES.ejector]: '0x610B517D380f287c239C93F8eF6FfBd567AA4bA5',
        [CONTRACT_NAMES.exitPenalties]:
          '0x06cd61045f958A209a0f8D746e103eCc625f4193',
        [CONTRACT_NAMES.feeDistributor]:
          '0xD99CC66fEC647E68294C6477B40fC7E0F6F618D0',
        [CONTRACT_NAMES.feeOracle]:
          '0x4D4074628678Bd302921c20573EEa1ed38DdF7FB',
        [CONTRACT_NAMES.parametersRegistry]:
          '0x9D28ad303C90DF524BA960d7a2DAC56DcC31e428',
        [CONTRACT_NAMES.validatorStrikes]:
          '0xaa328816027F2D32B9F56d190BC9Fa4A5C07637f',
        [CONTRACT_NAMES.verifier]: '0xfce7aB839e55de77730716D05b3553e45ab3A5Ba',
        [CONTRACT_NAMES.hashConsensus]:
          '0x71093efF8D8599b5fA340D665Ad60fA7C80688e4',
        [CONTRACT_NAMES.permissionlessGate]:
          '0xb8cd8F059Ad7a5dB8CAfDe34aAb007317F7156C8',
        [CONTRACT_NAMES.icsGate]: '0xB314D4A76C457c93150d308787939063F4Cc67E0',
        [CONTRACT_NAMES.idvtcGate]:
          '0xa12760721A72A7199aB38059DA6690b9Cd4ed7B8',
      },
      moduleId: 3n,
      deploymentBlockNumber: BigInt('0x13f7326'),
    },
    [CHAINS.Hoodi]: {
      contractAddresses: {
        [CONTRACT_NAMES.csModule]: '0x79CEf36D84743222f37765204Bec41E92a93E59d',
        [CONTRACT_NAMES.accounting]:
          '0xA54b90BA34C5f326BC1485054080994e38FB4C60',
        [CONTRACT_NAMES.ejector]: '0xCAe028378d69D54dc8bF809e6C44CF751F997b80',
        [CONTRACT_NAMES.exitPenalties]:
          '0xD259b31083Be841E5C85b2D481Cfc17C14276800',
        [CONTRACT_NAMES.feeDistributor]:
          '0xaCd9820b0A2229a82dc1A0770307ce5522FF3582',
        [CONTRACT_NAMES.feeOracle]:
          '0xe7314f561B2e72f9543F1004e741bab6Fc51028B',
        [CONTRACT_NAMES.parametersRegistry]:
          '0xA4aD5236963f9Fe4229864712269D8d79B65C5Ad',
        [CONTRACT_NAMES.validatorStrikes]:
          '0x8fBA385C3c334D251eE413e79d4D3890db98693c',
        [CONTRACT_NAMES.verifier]: '0xC96406b0eADdAC5708aFCa04DcCA67BAdC9642Fd',
        [CONTRACT_NAMES.hashConsensus]:
          '0x54f74a10e4397dDeF85C4854d9dfcA129D72C637',
        [CONTRACT_NAMES.permissionlessGate]:
          '0xd7bD8D2A9888D1414c770B35ACF55890B15de26a',
        [CONTRACT_NAMES.icsGate]: '0x10a254E724fe2b7f305F76f3F116a3969c53845f',
        [CONTRACT_NAMES.idvtcGate]:
          '0x887F8512F9998045f4b5993e6eaa6BCfE5F02A94',
      },
      moduleId: 4n,
      deploymentBlockNumber: BigInt('0x1374'),
    },
  },

  [MODULE_NAME.CM]: {
    [CHAINS.Mainnet]: {
      contractAddresses: {
        [CONTRACT_NAMES.curatedModule]:
          '0xDa5F930cE326EB5205085D66c72A4E79d60cB8C1',
        [CONTRACT_NAMES.accounting]:
          '0x2F91e3A8C5d6593bf4F8403fCfeCcd62dF59f6F6',
        [CONTRACT_NAMES.ejector]: '0xe181A377A2d2BDE9A83f1474BC3DB7A412de091E',
        [CONTRACT_NAMES.exitPenalties]:
          '0x004aFb7DAA7dEA20EbAaB75c9F4892C879FaCCe0',
        [CONTRACT_NAMES.feeDistributor]:
          '0x367d23c756599c20DCc8D6943F4976E8F88D60d7',
        [CONTRACT_NAMES.feeOracle]:
          '0x8EeFCdbD984c30E472BcbF545783D051CB5114e5',
        [CONTRACT_NAMES.parametersRegistry]:
          '0xffC1C5d59CeAC6F6c27E701F04a70cb50474607C',
        [CONTRACT_NAMES.validatorStrikes]:
          '0xf4618370a1fBf46905B16C10817c8CFaD924D6db',
        [CONTRACT_NAMES.verifier]: '0xC392F457960f1B13Ebaf1aa6C065479dD507E1E3',
        [CONTRACT_NAMES.hashConsensus]:
          '0x902D64c93F6595339aA46105627a085591051aFb',
        [CONTRACT_NAMES.metaRegistry]:
          '0xA64b339eebD3dC3De848298B6a140955932901d8',
        [CONTRACT_NAMES.curatedGatePO]:
          '0x6093EFA6B5E2FF3be54d1c895c9deA932805c49F',
        [CONTRACT_NAMES.curatedGatePTO]:
          '0x8c002c6eE10cf8adb78D1F9EB2e134FdaF8A7C1a',
        [CONTRACT_NAMES.curatedGatePGO]:
          '0x207798e6fD1aa7Ee8a63782A64c959cD6727b78C',
        [CONTRACT_NAMES.curatedGateDO]:
          '0xeF273Ca4A21Ba7B414Ae3C9f9b443038cb133F72',
        [CONTRACT_NAMES.curatedGateEEO]:
          '0x3BbBb175f7F07954DE00052b20E1c5572223F24D',
        [CONTRACT_NAMES.curatedGateIODC]:
          '0x86A8d4E0db5938D21d98047544668FCCB1A9ADc8',
        [CONTRACT_NAMES.curatedGateIODCP]:
          '0x773933F9db8964A17d62fb808f2EC7A2de4247CC',
      },
      // CM is not registered in StakingRouter yet (3 modules as of 2026-07) —
      // confirm the assigned id once the DAO vote executes
      moduleId: 4n,
      deploymentBlockNumber: BigInt('0x1845a2b'),
    },
    [CHAINS.Hoodi]: {
      contractAddresses: {
        [CONTRACT_NAMES.curatedModule]:
          '0x87EB69Ae51317405FD285efD2326a4a11f6173b9',
        [CONTRACT_NAMES.accounting]:
          '0x7f7356D29aCd915F1934220956c3305808ceB235',
        [CONTRACT_NAMES.ejector]: '0xfDbde2B3554B69C84e0f8d7daB68D390Ff0f4394',
        [CONTRACT_NAMES.exitPenalties]:
          '0xad79e1d3B380cEb1a0e188fBAB91f85A446E9E54',
        [CONTRACT_NAMES.feeDistributor]:
          '0x0ced6de191E2A15f7BBAf9E32307626C9f6BD0Cd',
        [CONTRACT_NAMES.feeOracle]:
          '0x5D2F27000C80f6f7A03015Fd49dB7FEba3fBfa83',
        [CONTRACT_NAMES.parametersRegistry]:
          '0xefb8e4091A75C4828826bf64595F392f87A07b37',
        [CONTRACT_NAMES.validatorStrikes]:
          '0x4c427Ec826F403339719C0FABfb3209e80939eA6',
        [CONTRACT_NAMES.verifier]: '0x209190Ebc2Be80367a15d05e626784Eb94d6A880',
        [CONTRACT_NAMES.hashConsensus]:
          '0x920883908A78c1554f682006a8aB32E62Be09F33',
        [CONTRACT_NAMES.metaRegistry]:
          '0x857289cCBFBc4C134Cc312022a104CD9b38d8AAE',
        [CONTRACT_NAMES.curatedGatePO]:
          '0xF1862d120831eBE31f7202378Ff3Ae63A5658ae3',
        [CONTRACT_NAMES.curatedGatePTO]:
          '0x410A309dF81B782190188CDB3d215729cc6bC1f3',
        [CONTRACT_NAMES.curatedGatePGO]:
          '0xa5A604b172787e017b1b118F02fE54fC1D696519',
        [CONTRACT_NAMES.curatedGateDO]:
          '0xE966874cDB6A4282ED75Cd10439e3799e5531a2D',
        [CONTRACT_NAMES.curatedGateEEO]:
          '0x5c063da03e3f21443716D75a2205EE16706e1153',
        [CONTRACT_NAMES.curatedGateIODC]:
          '0x1cD655Ac53CfE8269DE0DBfc0140B074623C4A6B',
        [CONTRACT_NAMES.curatedGateIODCP]:
          '0x28518be9894C20135F280a9539617783b08a04c7',
      },
      moduleId: 5n,
      deploymentBlockNumber: BigInt('0x28a0f0'),
    },
  },

  // Not deployed on any network yet — addresses are filled in per chain as
  // CSM 0x02 deploys.
  [MODULE_NAME.CSM_02]: {},
};
