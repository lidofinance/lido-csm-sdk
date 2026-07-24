/**
 * Minimal ABI for checking contract versions.
 * Contains only getInitializedVersion method supported by all versioned contracts.
 */
export const VersionCheckAbi = [
  {
    type: 'function',
    name: 'getInitializedVersion',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint64',
        internalType: 'uint64',
      },
    ],
    stateMutability: 'view',
  },
] as const;
