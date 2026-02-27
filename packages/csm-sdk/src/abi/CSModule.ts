import { BaseModuleAbi } from './BaseModule.js';

const CSModuleExtrasAbi = [
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
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'MANAGE_TOP_UP_QUEUE_ROLE',
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
    name: 'REWIND_TOP_UP_QUEUE_ROLE',
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
    name: 'cleanDepositQueue',
    inputs: [
      {
        name: 'maxItems',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'removed',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'lastRemovedAtDepth',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'depositQueueItem',
    inputs: [
      {
        name: 'queuePriority',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'index',
        type: 'uint128',
        internalType: 'uint128',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'Batch',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'depositQueuePointers',
    inputs: [
      {
        name: 'queuePriority',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'head',
        type: 'uint128',
        internalType: 'uint128',
      },
      {
        name: 'tail',
        type: 'uint128',
        internalType: 'uint128',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'finalizeUpgradeV3',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getKeysForTopUp',
    inputs: [
      {
        name: 'maxKeyCount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'pubkeys',
        type: 'bytes[]',
        internalType: 'bytes[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTopUpQueue',
    inputs: [],
    outputs: [
      {
        name: 'enabled',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: 'limit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'length',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'head',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTopUpQueueItem',
    inputs: [
      {
        name: 'index',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'keyIndex',
        type: 'uint256',
        internalType: 'uint256',
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
      {
        name: 'topUpQueueLimit',
        type: 'uint8',
        internalType: 'uint8',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'rewindTopUpQueue',
    inputs: [
      {
        name: 'to',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setTopUpQueueLimit',
    inputs: [
      {
        name: 'limit',
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
        name: '',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'BatchEnqueued',
    inputs: [
      {
        name: 'queuePriority',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'count',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TopUpQueueLimitSet',
    inputs: [
      {
        name: 'limit',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TopUpQueueRewound',
    inputs: [
      {
        name: 'to',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'DepositQueueIsEmpty',
    inputs: [],
  },
  {
    type: 'error',
    name: 'DepositQueueLookupNoLimit',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidSigningKey',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidTopUpOrder',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoQueuedKeysToMigrate',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NotEligibleForPriorityQueue',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PriorityQueueAlreadyUsed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PriorityQueueMaxDepositsUsed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'RewindForward',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SafeCastOverflowedUintDowncast',
    inputs: [
      {
        name: 'bits',
        type: 'uint8',
        internalType: 'uint8',
      },
      {
        name: 'value',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'SameTopUpQueueLimit',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TopUpQueueDisabled',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TopUpQueueIsEmpty',
    inputs: [],
  },
  {
    type: 'error',
    name: 'TopUpQueueIsFull',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnexpectedExtraKey',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroTopUpQueueLimit',
    inputs: [],
  },
] as const;

export const CSModuleAbi = [...BaseModuleAbi, ...CSModuleExtrasAbi] as const;
