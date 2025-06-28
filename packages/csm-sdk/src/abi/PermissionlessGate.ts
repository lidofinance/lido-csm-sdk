export const PermissionlessGateAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "admin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "CURVE_ID",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "DEFAULT_ADMIN_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract ICSModule"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "RECOVERER_ROLE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addNodeOperatorETH",
    "inputs": [
      {
        "name": "keysCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "publicKeys",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "signatures",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "managementProperties",
        "type": "tuple",
        "internalType": "struct NodeOperatorManagementProperties",
        "components": [
          {
            "name": "managerAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "rewardAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "extendedManagerPermissions",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "name": "referrer",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "nodeOperatorId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "addNodeOperatorStETH",
    "inputs": [
      {
        "name": "keysCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "publicKeys",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "signatures",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "managementProperties",
        "type": "tuple",
        "internalType": "struct NodeOperatorManagementProperties",
        "components": [
          {
            "name": "managerAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "rewardAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "extendedManagerPermissions",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "name": "permit",
        "type": "tuple",
        "internalType": "struct ICSAccounting.PermitInput",
        "components": [
          {
            "name": "value",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "v",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "r",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "s",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      },
      {
        "name": "referrer",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "nodeOperatorId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "addNodeOperatorWstETH",
    "inputs": [
      {
        "name": "keysCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "publicKeys",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "signatures",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "managementProperties",
        "type": "tuple",
        "internalType": "struct NodeOperatorManagementProperties",
        "components": [
          {
            "name": "managerAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "rewardAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "extendedManagerPermissions",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      },
      {
        "name": "permit",
        "type": "tuple",
        "internalType": "struct ICSAccounting.PermitInput",
        "components": [
          {
            "name": "value",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "v",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "r",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "s",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      },
      {
        "name": "referrer",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "nodeOperatorId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getRoleAdmin",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleMember",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRoleMemberCount",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "recoverERC1155",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "recoverERC20",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "recoverERC721",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "recoverEther",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "callerConfirmation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeRole",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "RoleAdminChanged",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleGranted",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoleRevoked",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AccessControlBadConfirmation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AccessControlUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "neededRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAdminAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroModuleAddress",
    "inputs": []
  }
] as const;