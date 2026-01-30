export const OperatorsDataAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'stakingRouter',
        type: 'address',
        internalType: 'address'
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'DEFAULT_ADMIN_ROLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'SETTER_ROLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    stateMutability: 'view'
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
    name: 'get',
    inputs: [
      {
        name: 'moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        internalType: 'struct OperatorInfo',
        components: [
          {
            name: 'name',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'description',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'ownerEditsRestricted',
            type: 'bool',
            internalType: 'bool'
          }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getRoleAdmin',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getRoleMember',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 'index',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'getRoleMemberCount',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32'
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
    name: 'grantRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'initialize',
    inputs: [
      {
        name: 'admin',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'isOwnerEditsRestricted',
    inputs: [
      {
        name: 'moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'renounceRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 'callerConfirmation',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'revokeRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32'
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'set',
    inputs: [
      {
        name: 'moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'info',
        type: 'tuple',
        internalType: 'struct OperatorInfo',
        components: [
          {
            name: 'name',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'description',
            type: 'string',
            internalType: 'string'
          },
          {
            name: 'ownerEditsRestricted',
            type: 'bool',
            internalType: 'bool'
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'setByOwner',
    inputs: [
      {
        name: 'moduleId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256'
      },
      {
        name: 'name',
        type: 'string',
        internalType: 'string'
      },
      {
        name: 'description',
        type: 'string',
        internalType: 'string'
      }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [
      {
        name: 'interfaceId',
        type: 'bytes4',
        internalType: 'bytes4'
      }
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool'
      }
    ],
    stateMutability: 'view'
  },
  {
    type: 'event',
    name: 'Initialized',
    inputs: [
      {
        name: 'version',
        type: 'uint64',
        indexed: false,
        internalType: 'uint64'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'ModuleAddressCached',
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
    type: 'event',
    name: 'OperatorDataSet',
    inputs: [
      {
        name: 'moduleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'module',
        type: 'address',
        indexed: false,
        internalType: 'address'
      },
      {
        name: 'nodeOperatorId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256'
      },
      {
        name: 'name',
        type: 'string',
        indexed: false,
        internalType: 'string'
      },
      {
        name: 'description',
        type: 'string',
        indexed: false,
        internalType: 'string'
      },
      {
        name: 'ownerEditsRestricted',
        type: 'bool',
        indexed: false,
        internalType: 'bool'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'RoleAdminChanged',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32'
      },
      {
        name: 'previousAdminRole',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32'
      },
      {
        name: 'newAdminRole',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'RoleGranted',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32'
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'RoleRevoked',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32'
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address'
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address'
      }
    ],
    anonymous: false
  },
  {
    type: 'error',
    name: 'AccessControlBadConfirmation',
    inputs: []
  },
  {
    type: 'error',
    name: 'AccessControlUnauthorizedAccount',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address'
      },
      {
        name: 'neededRole',
        type: 'bytes32',
        internalType: 'bytes32'
      }
    ]
  },
  {
    type: 'error',
    name: 'InvalidInitialization',
    inputs: []
  },
  {
    type: 'error',
    name: 'ModuleDoesNotSupportNodeOperatorOwnerInterface',
    inputs: []
  },
  {
    type: 'error',
    name: 'NodeOperatorDoesNotExist',
    inputs: []
  },
  {
    type: 'error',
    name: 'NotInitializing',
    inputs: []
  },
  {
    type: 'error',
    name: 'OwnerEditsRestricted',
    inputs: []
  },
  {
    type: 'error',
    name: 'SenderIsNotEligible',
    inputs: []
  },
  {
    type: 'error',
    name: 'UnknownModule',
    inputs: []
  },
  {
    type: 'error',
    name: 'ZeroAdminAddress',
    inputs: []
  },
  {
    type: 'error',
    name: 'ZeroModuleId',
    inputs: []
  },
  {
    type: 'error',
    name: 'ZeroStakingRouterAddress',
    inputs: []
  },
] as const;
