export const WithdrawalVaultAbi = [
  {
    type: 'function',
    name: 'getWithdrawalRequestFee',
    inputs: [],
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
    type: 'event',
    name: 'WithdrawalRequestAdded',
    inputs: [
      {
        name: 'request',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
] as const;