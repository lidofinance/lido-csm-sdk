export const CuratedGateFactoryAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'curatedGateImpl',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'CURATED_GATE_IMPL',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'create',
    inputs: [
      {
        name: 'curveId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'treeRoot',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'treeCid',
        type: 'string',
        internalType: 'string',
      },
      {
        name: 'admin',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'instance',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'CuratedGateCreated',
    inputs: [
      {
        name: 'gate',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'ZeroImplementationAddress',
    inputs: [],
  },
] as const;
