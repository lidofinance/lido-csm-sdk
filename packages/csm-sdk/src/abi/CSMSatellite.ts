export const CSMSatelliteAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_csModuleAddress',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'csModule',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract ICSModule',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'findNodeOperatorsByAddress',
    inputs: [
      {
        name: '_addressToSearch',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_offset',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_limit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_searchMode',
        type: 'uint8',
        internalType: 'enum SearchMode',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDepositQueueBatches',
    inputs: [
      {
        name: '_queuePriority',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_startIndex',
        type: 'uint128',
        internalType: 'uint128',
      },
      {
        name: '_limit',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256[]',
        internalType: 'Batch[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNodeOperatorsByAddress',
    inputs: [
      {
        name: '_addressToSearch',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_offset',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_limit',
        type: 'uint256',
        internalType: 'uint256',
      },
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
            internalType: 'uint256',
          },
          {
            name: 'managerAddress',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'rewardAddress',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'extendedManagerPermissions',
            type: 'bool',
            internalType: 'bool',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNodeOperatorsByProposedAddress',
    inputs: [
      {
        name: '_addressToSearch',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_offset',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_limit',
        type: 'uint256',
        internalType: 'uint256',
      },
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
            internalType: 'uint256',
          },
          {
            name: 'proposedManagerAddress',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'proposedRewardAddress',
            type: 'address',
            internalType: 'address',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;
