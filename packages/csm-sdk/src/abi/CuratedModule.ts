import { BaseModuleAbi } from './BaseModule.js';

const CuratedModuleExtrasAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'moduleType',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'lidoLocator',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'parametersRegistry',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'accounting',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'exitPenalties',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'metaRegistry',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'META_REGISTRY',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IMetaRegistry',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'OPERATOR_ADDRESSES_ADMIN_ROLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allocateDeposits',
    inputs: [
      {
        name: 'maxDepositAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'pubkeys',
        type: 'bytes[]',
        internalType: 'bytes[]',
      },
      {
        name: 'keyIndices',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'operatorIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'topUpLimits',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    outputs: [
      {
        name: 'allocations',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'changeNodeOperatorAddresses',
    inputs: [
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'newManagerAddress',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'newRewardAddress',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getDepositsAllocation',
    inputs: [
      {
        name: 'maxDepositAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'allocated',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'operatorIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'allocations',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNodeOperatorBalance',
    inputs: [
      {
        name: 'operatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOperatorWeights',
    inputs: [
      {
        name: 'operatorIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    outputs: [
      {
        name: 'operatorWeights',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'initialize',
    inputs: [
      {
        name: 'admin',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'notifyNodeOperatorWeightChange',
    inputs: [
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'oldWeight',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'newWeight',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateOperatorBalances',
    inputs: [
      {
        name: 'operatorIds',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'totalBalancesGwei',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'NodeOperatorBalanceUpdated',
    inputs: [
      {
        name: 'operatorId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'balanceWei',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'NodeOperatorWeightsUpToDate',
    inputs: [],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'InvalidMaxCount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidSigningKey',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NodeOperatorWeightsUpdateInProgress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SenderIsNotMetaRegistry',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroMetaRegistryAddress',
    inputs: [],
  },
] as const;

export const CuratedModuleAbi = [
  ...BaseModuleAbi,
  ...CuratedModuleExtrasAbi,
] as const;
