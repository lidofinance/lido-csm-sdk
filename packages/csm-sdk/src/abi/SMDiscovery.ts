export const SMDiscoveryAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_stakingRouter',
        type: 'address',
        internalType: 'address'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'STAKING_ROUTER',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IStakingRouter'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: '_tryGetQueuePriority',
    inputs: [
      {
        name: '_module',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'findNodeOperatorsByAddress',
    inputs: [
      {
        name: '_moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_addressToSearch',
        type: 'address',
        internalType: 'address'
      },
      {
        name: '_offset',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_limit',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_searchMode',
        type: 'uint8',
        internalType: 'enum SearchMode'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'uint256[]',
        internalType: 'uint256[]'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getDepositQueueBatches',
    inputs: [
      {
        name: '_moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_queuePriority',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_cursorIndex',
        type: 'uint128',
        internalType: 'uint128'
      },
      {
        name: '_limit',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'uint256[]',
        internalType: 'Batch[]'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getNodeOperatorsByAddress',
    inputs: [
      {
        name: '_moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_addressToSearch',
        type: 'address',
        internalType: 'address'
      },
      {
        name: '_offset',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_limit',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct NodeOperatorShort[]',
        components: [
          {
            name: 'id',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'managerAddress',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'rewardAddress',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'extendedManagerPermissions',
            type: 'bool',
            internalType: 'bool'
          },
          {
            name: 'curveId',
            type: 'uint256',
            internalType: 'uint256'
          }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getNodeOperatorsByProposedAddress',
    inputs: [
      {
        name: '_moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_addressToSearch',
        type: 'address',
        internalType: 'address'
      },
      {
        name: '_offset',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_limit',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct NodeOperatorProposed[]',
        components: [
          {
            name: 'id',
            type: 'uint256',
            internalType: 'uint256'
          },
          {
            name: 'proposedManagerAddress',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'proposedRewardAddress',
            type: 'address',
            internalType: 'address'
          },
          {
            name: 'curveId',
            type: 'uint256',
            internalType: 'uint256'
          }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getNodeOperatorsDepositableValidatorsCount',
    inputs: [
      {
        name: '_moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_offset',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: '_limit',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'uint32[]',
        internalType: 'uint32[]'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'moduleCache',
    inputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: 'moduleAddress',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'accountingAddress',
        type: 'address',
        internalType: 'address'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'updateModuleCache',
    inputs: [
      {
        name: '_moduleId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'event',
    name: 'ModuleCacheUpdated',
    inputs: [
      {
        name: 'moduleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'moduleAddress',
        type: 'address',
        indexed: false,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'error',
    name: 'AddressCannotBeZero',
    inputs: []
  },
  {
    type: 'error',
    name: 'CursorBehindQueueHead',
    inputs: [
      {
        name: 'cursor',
        type: 'uint128',
        internalType: 'uint128'
      },
      {
        name: 'head',
        type: 'uint128',
        internalType: 'uint128'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidLimit',
    inputs: [
      {
        name: 'provided',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'max',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidQueuePriority',
    inputs: [
      {
        name: 'provided',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'max',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidStakingRouterAddress',
    inputs: []
  },
  {
    type: 'error',
    name: 'ModuleAlreadyCached',
    inputs: [
      {
        name: 'moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'moduleAddress',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'ModuleCacheNotInitialized',
    inputs: [
      {
        name: 'moduleId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ]
  },
  {
    type: 'error',
    name: 'ModuleDoesNotSupportQueueOperations',
    inputs: [
      {
        name: 'moduleAddress',
        type: 'address',
        internalType: 'address'
      }
    ]
  },
  {
    type: 'error',
    name: 'ZeroModuleId',
    inputs: []
  },
] as const;
