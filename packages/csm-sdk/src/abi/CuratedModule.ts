import { BaseModuleAbi } from './BaseModule';

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
    name: 'getDepositAllocationTargets',
    inputs: [],
    outputs: [
      {
        name: 'currentValidators',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'targetValidators',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
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
    name: 'getNodeOperatorWeightAndExternalStake',
    inputs: [
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'weight',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'externalStake',
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
    name: 'getTopUpAllocationTargets',
    inputs: [],
    outputs: [
      {
        name: 'currentAllocations',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'targetAllocations',
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
    type: 'error',
    name: 'InvalidSigningKey',
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
