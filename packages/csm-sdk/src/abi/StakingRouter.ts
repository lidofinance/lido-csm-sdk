export const StakingRouterAbi = [
  {
    type: 'receive',
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'DEFAULT_ADMIN_ROLE',
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
    name: 'DEPOSIT_CONTRACT',
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
    name: 'FEE_PRECISION_POINTS',
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
    type: 'function',
    name: 'MANAGE_WITHDRAWAL_CREDENTIALS_ROLE',
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
    name: 'MAX_STAKING_MODULES_COUNT',
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
    type: 'function',
    name: 'MAX_STAKING_MODULE_NAME_LENGTH',
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
    type: 'function',
    name: 'REPORT_EXITED_VALIDATORS_ROLE',
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
    name: 'REPORT_REWARDS_MINTED_ROLE',
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
    name: 'STAKING_MODULE_MANAGE_ROLE',
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
    name: 'STAKING_MODULE_UNVETTING_ROLE',
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
    name: 'TOTAL_BASIS_POINTS',
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
    type: 'function',
    name: 'UNSAFE_SET_EXITED_VALIDATORS_ROLE',
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
    name: 'addStakingModule',
    inputs: [
      {
        name: '_name',
        type: 'string',
        internalType: 'string',
      },
      {
        name: '_stakingModuleAddress',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_stakeShareLimit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_priorityExitShareThreshold',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_stakingModuleFee',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_treasuryFee',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_maxDepositsPerBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_minDepositBlockDistance',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'decreaseStakingModuleVettedKeysCountByNodeOperator',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_nodeOperatorIds',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '_vettedSigningKeysCounts',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      {
        name: '_depositsCount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_depositCalldata',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'finalizeUpgrade_v2',
    inputs: [
      {
        name: '_priorityExitShareThresholds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAllNodeOperatorDigests',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct IStakingRouter.NodeOperatorDigest[]',
        components: [
          {
            name: 'id',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'isActive',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'summary',
            type: 'tuple',
            internalType: 'struct IStakingRouter.NodeOperatorSummary',
            components: [
              {
                name: 'targetLimitMode',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'targetValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'stuckValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'refundedValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'stuckPenaltyEndTimestamp',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'totalExitedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'totalDepositedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'depositableValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAllStakingModuleDigests',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct IStakingRouter.StakingModuleDigest[]',
        components: [
          {
            name: 'nodeOperatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'activeNodeOperatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'state',
            type: 'tuple',
            internalType: 'struct IStakingRouter.StakingModule',
            components: [
              {
                name: 'id',
                type: 'uint24',
                internalType: 'uint24',
              },
              {
                name: 'stakingModuleAddress',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'stakingModuleFee',
                type: 'uint16',
                internalType: 'uint16',
              },
              {
                name: 'treasuryFee',
                type: 'uint16',
                internalType: 'uint16',
              },
              {
                name: 'stakeShareLimit',
                type: 'uint16',
                internalType: 'uint16',
              },
              {
                name: 'status',
                type: 'uint8',
                internalType: 'uint8',
              },
              {
                name: 'name',
                type: 'string',
                internalType: 'string',
              },
              {
                name: 'lastDepositAt',
                type: 'uint64',
                internalType: 'uint64',
              },
              {
                name: 'lastDepositBlock',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'exitedValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'priorityExitShareThreshold',
                type: 'uint16',
                internalType: 'uint16',
              },
              {
                name: 'maxDepositsPerBlock',
                type: 'uint64',
                internalType: 'uint64',
              },
              {
                name: 'minDepositBlockDistance',
                type: 'uint64',
                internalType: 'uint64',
              },
            ],
          },
          {
            name: 'summary',
            type: 'tuple',
            internalType: 'struct IStakingRouter.StakingModuleSummary',
            components: [
              {
                name: 'totalExitedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'totalDepositedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'depositableValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getContractVersion',
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
    type: 'function',
    name: 'getDepositsAllocation',
    inputs: [
      {
        name: '_depositsCount',
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
        name: 'allocations',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLido',
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
    name: 'getNodeOperatorDigests',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_nodeOperatorIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    outputs: [
      {
        name: 'digests',
        type: 'tuple[]',
        internalType: 'struct IStakingRouter.NodeOperatorDigest[]',
        components: [
          {
            name: 'id',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'isActive',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'summary',
            type: 'tuple',
            internalType: 'struct IStakingRouter.NodeOperatorSummary',
            components: [
              {
                name: 'targetLimitMode',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'targetValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'stuckValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'refundedValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'stuckPenaltyEndTimestamp',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'totalExitedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'totalDepositedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'depositableValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNodeOperatorDigests',
    inputs: [
      {
        name: '_stakingModuleId',
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
        internalType: 'struct IStakingRouter.NodeOperatorDigest[]',
        components: [
          {
            name: 'id',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'isActive',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'summary',
            type: 'tuple',
            internalType: 'struct IStakingRouter.NodeOperatorSummary',
            components: [
              {
                name: 'targetLimitMode',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'targetValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'stuckValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'refundedValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'stuckPenaltyEndTimestamp',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'totalExitedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'totalDepositedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'depositableValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getNodeOperatorSummary',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'summary',
        type: 'tuple',
        internalType: 'struct IStakingRouter.NodeOperatorSummary',
        components: [
          {
            name: 'targetLimitMode',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'targetValidatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'stuckValidatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'refundedValidatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'stuckPenaltyEndTimestamp',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'totalExitedValidators',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'totalDepositedValidators',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'depositableValidatorsCount',
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
    name: 'getRoleAdmin',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
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
    name: 'getRoleMember',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'index',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
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
    name: 'getRoleMemberCount',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
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
    name: 'getStakingFeeAggregateDistribution',
    inputs: [],
    outputs: [
      {
        name: 'modulesFee',
        type: 'uint96',
        internalType: 'uint96',
      },
      {
        name: 'treasuryFee',
        type: 'uint96',
        internalType: 'uint96',
      },
      {
        name: 'basePrecision',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingFeeAggregateDistributionE4Precision',
    inputs: [],
    outputs: [
      {
        name: 'modulesFee',
        type: 'uint16',
        internalType: 'uint16',
      },
      {
        name: 'treasuryFee',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModule',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IStakingRouter.StakingModule',
        components: [
          {
            name: 'id',
            type: 'uint24',
            internalType: 'uint24',
          },
          {
            name: 'stakingModuleAddress',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'stakingModuleFee',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'treasuryFee',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'stakeShareLimit',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'status',
            type: 'uint8',
            internalType: 'uint8',
          },
          {
            name: 'name',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'lastDepositAt',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'lastDepositBlock',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'exitedValidatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'priorityExitShareThreshold',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'maxDepositsPerBlock',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'minDepositBlockDistance',
            type: 'uint64',
            internalType: 'uint64',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModuleActiveValidatorsCount',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'activeValidatorsCount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModuleDigests',
    inputs: [
      {
        name: '_stakingModuleIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    outputs: [
      {
        name: 'digests',
        type: 'tuple[]',
        internalType: 'struct IStakingRouter.StakingModuleDigest[]',
        components: [
          {
            name: 'nodeOperatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'activeNodeOperatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'state',
            type: 'tuple',
            internalType: 'struct IStakingRouter.StakingModule',
            components: [
              {
                name: 'id',
                type: 'uint24',
                internalType: 'uint24',
              },
              {
                name: 'stakingModuleAddress',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'stakingModuleFee',
                type: 'uint16',
                internalType: 'uint16',
              },
              {
                name: 'treasuryFee',
                type: 'uint16',
                internalType: 'uint16',
              },
              {
                name: 'stakeShareLimit',
                type: 'uint16',
                internalType: 'uint16',
              },
              {
                name: 'status',
                type: 'uint8',
                internalType: 'uint8',
              },
              {
                name: 'name',
                type: 'string',
                internalType: 'string',
              },
              {
                name: 'lastDepositAt',
                type: 'uint64',
                internalType: 'uint64',
              },
              {
                name: 'lastDepositBlock',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'exitedValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'priorityExitShareThreshold',
                type: 'uint16',
                internalType: 'uint16',
              },
              {
                name: 'maxDepositsPerBlock',
                type: 'uint64',
                internalType: 'uint64',
              },
              {
                name: 'minDepositBlockDistance',
                type: 'uint64',
                internalType: 'uint64',
              },
            ],
          },
          {
            name: 'summary',
            type: 'tuple',
            internalType: 'struct IStakingRouter.StakingModuleSummary',
            components: [
              {
                name: 'totalExitedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'totalDepositedValidators',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'depositableValidatorsCount',
                type: 'uint256',
                internalType: 'uint256',
              },
            ],
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModuleIds',
    inputs: [],
    outputs: [
      {
        name: 'stakingModuleIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModuleIsActive',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModuleIsDepositsPaused',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModuleIsStopped',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModuleLastDepositBlock',
    inputs: [
      {
        name: '_stakingModuleId',
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
    name: 'getStakingModuleMaxDepositsCount',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_maxDepositsValue',
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
    name: 'getStakingModuleMaxDepositsPerBlock',
    inputs: [
      {
        name: '_stakingModuleId',
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
    name: 'getStakingModuleMinDepositBlockDistance',
    inputs: [
      {
        name: '_stakingModuleId',
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
    name: 'getStakingModuleNonce',
    inputs: [
      {
        name: '_stakingModuleId',
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
    name: 'getStakingModuleStatus',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'uint8',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModuleSummary',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'summary',
        type: 'tuple',
        internalType: 'struct IStakingRouter.StakingModuleSummary',
        components: [
          {
            name: 'totalExitedValidators',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'totalDepositedValidators',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'depositableValidatorsCount',
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
    name: 'getStakingModules',
    inputs: [],
    outputs: [
      {
        name: 'res',
        type: 'tuple[]',
        internalType: 'struct IStakingRouter.StakingModule[]',
        components: [
          {
            name: 'id',
            type: 'uint24',
            internalType: 'uint24',
          },
          {
            name: 'stakingModuleAddress',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'stakingModuleFee',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'treasuryFee',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'stakeShareLimit',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'status',
            type: 'uint8',
            internalType: 'uint8',
          },
          {
            name: 'name',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'lastDepositAt',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'lastDepositBlock',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'exitedValidatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'priorityExitShareThreshold',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'maxDepositsPerBlock',
            type: 'uint64',
            internalType: 'uint64',
          },
          {
            name: 'minDepositBlockDistance',
            type: 'uint64',
            internalType: 'uint64',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingModulesCount',
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
    type: 'function',
    name: 'getStakingRewardsDistribution',
    inputs: [],
    outputs: [
      {
        name: 'recipients',
        type: 'address[]',
        internalType: 'address[]',
      },
      {
        name: 'stakingModuleIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: 'stakingModuleFees',
        type: 'uint96[]',
        internalType: 'uint96[]',
      },
      {
        name: 'totalFee',
        type: 'uint96',
        internalType: 'uint96',
      },
      {
        name: 'precisionPoints',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTotalFeeE4Precision',
    inputs: [],
    outputs: [
      {
        name: 'totalFee',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getWithdrawalCredentials',
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
    name: 'grantRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'hasRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasStakingModule',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'initialize',
    inputs: [
      {
        name: '_admin',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_lido',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_withdrawalCredentials',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'onValidatorsCountsByNodeOperatorReportingFinished',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'renounceRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reportRewardsMinted',
    inputs: [
      {
        name: '_stakingModuleIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: '_totalShares',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reportStakingModuleExitedValidatorsCountByNodeOperator',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_nodeOperatorIds',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '_exitedValidatorsCounts',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reportStakingModuleStuckValidatorsCountByNodeOperator',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_nodeOperatorIds',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '_stuckValidatorsCounts',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reportValidatorExitDelay',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_proofSlotTimestamp',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_publicKey',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: '_eligibleToExitInSec',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeRole',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setStakingModuleStatus',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_status',
        type: 'uint8',
        internalType: 'uint8',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setWithdrawalCredentials',
    inputs: [
      {
        name: '_withdrawalCredentials',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [
      {
        name: 'interfaceId',
        type: 'bytes4',
        internalType: 'bytes4',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'unsafeSetExitedValidatorsCount',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_triggerUpdateFinish',
        type: 'bool',
        internalType: 'bool',
      },
      {
        name: '_correction',
        type: 'tuple',
        internalType: 'struct IStakingRouter.ValidatorsCountsCorrection',
        components: [
          {
            name: 'currentModuleExitedValidatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'currentNodeOperatorExitedValidatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'newModuleExitedValidatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'newNodeOperatorExitedValidatorsCount',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateExitedValidatorsCountByStakingModule',
    inputs: [
      {
        name: '_stakingModuleIds',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
      {
        name: '_exitedValidatorsCounts',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateRefundedValidatorsCount',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_refundedValidatorsCount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateStakingModule',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_stakeShareLimit',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_priorityExitShareThreshold',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_stakingModuleFee',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_treasuryFee',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_maxDepositsPerBlock',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_minDepositBlockDistance',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateTargetValidatorsLimits',
    inputs: [
      {
        name: '_stakingModuleId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_nodeOperatorId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_targetLimitMode',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: '_targetLimit',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'ContractVersionSet',
    inputs: [
      {
        name: 'version',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ExitedAndStuckValidatorsCountsUpdateFailed',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'lowLevelRevertData',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RewardsMintedReportFailed',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'lowLevelRevertData',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RoleAdminChanged',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'previousAdminRole',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'newAdminRole',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RoleGranted',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RoleRevoked',
    inputs: [
      {
        name: 'role',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'sender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakingModuleAdded',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'stakingModule',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'name',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'createdBy',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakingModuleExitedValidatorsIncompleteReporting',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'unreportedExitedValidatorsCount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakingModuleFeesSet',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'stakingModuleFee',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'treasuryFee',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'setBy',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakingModuleMaxDepositsPerBlockSet',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'maxDepositsPerBlock',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'setBy',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakingModuleMinDepositBlockDistanceSet',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'minDepositBlockDistance',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'setBy',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakingModuleShareLimitSet',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'stakeShareLimit',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'priorityExitShareThreshold',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'setBy',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakingModuleStatusSet',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'status',
        type: 'uint8',
        indexed: false,
        internalType: 'uint8',
      },
      {
        name: 'setBy',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakingRouterETHDeposited',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'WithdrawalCredentialsSet',
    inputs: [
      {
        name: 'withdrawalCredentials',
        type: 'bytes32',
        indexed: false,
        internalType: 'bytes32',
      },
      {
        name: 'setBy',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'WithdrawalsCredentialsChangeFailed',
    inputs: [
      {
        name: 'stakingModuleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'lowLevelRevertData',
        type: 'bytes',
        indexed: false,
        internalType: 'bytes',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AppAuthLidoFailed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ArraysLengthMismatch',
    inputs: [
      {
        name: 'firstArrayLength',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'secondArrayLength',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'DepositContractZeroAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'DirectETHTransfer',
    inputs: [],
  },
  {
    type: 'error',
    name: 'EmptyWithdrawalsCredentials',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ExitedValidatorsCountCannotDecrease',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidContractVersionIncrement',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidDepositsValue',
    inputs: [
      {
        name: 'etherValue',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'depositsCount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidMinDepositBlockDistance',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidPriorityExitShareThreshold',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidPublicKeysBatchLength',
    inputs: [
      {
        name: 'actual',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'expected',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidReportData',
    inputs: [
      {
        name: 'code',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidSignaturesBatchLength',
    inputs: [
      {
        name: 'actual',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'expected',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'NonZeroContractVersionOnInit',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReportedExitedValidatorsExceedDeposited',
    inputs: [
      {
        name: 'reportedExitedValidatorsCount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'depositedValidatorsCount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'StakingModuleAddressExists',
    inputs: [],
  },
  {
    type: 'error',
    name: 'StakingModuleNotActive',
    inputs: [],
  },
  {
    type: 'error',
    name: 'StakingModuleStatusTheSame',
    inputs: [],
  },
  {
    type: 'error',
    name: 'StakingModuleUnregistered',
    inputs: [],
  },
  {
    type: 'error',
    name: 'StakingModuleWrongName',
    inputs: [],
  },
  {
    type: 'error',
    name: 'StakingModulesLimitExceeded',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnexpectedContractVersion',
    inputs: [
      {
        name: 'expected',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'received',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'UnexpectedCurrentValidatorsCount',
    inputs: [
      {
        name: 'currentModuleExitedValidatorsCount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'currentNodeOpExitedValidatorsCount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'currentNodeOpStuckValidatorsCount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  {
    type: 'error',
    name: 'UnrecoverableModuleError',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ValueOver100Percent',
    inputs: [
      {
        name: 'field',
        type: 'string',
        internalType: 'string',
      },
    ],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [
      {
        name: 'field',
        type: 'string',
        internalType: 'string',
      },
    ],
  },
] as const;
