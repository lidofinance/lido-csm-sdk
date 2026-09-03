/** Pre-claimer SMDiscovery outputs; remove once the upgraded implementation is live on all networks. */
export const SMDiscoveryV1Abi = [
  {
    type: 'function',
    name: 'getAllNodeOperators',
    inputs: [
      {
        name: '_moduleId',
        type: 'uint256',
        internalType: 'uint256',
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
        internalType: 'struct NodeOperatorInfo[]',
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
          {
            name: 'curveId',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNodeOperatorsByAddress',
    inputs: [
      {
        name: '_moduleId',
        type: 'uint256',
        internalType: 'uint256',
      },
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
          {
            name: 'curveId',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOperatorsByCurveId',
    inputs: [
      {
        name: '_moduleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_curveId',
        type: 'uint256',
        internalType: 'uint256',
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
          {
            name: 'curveId',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;
