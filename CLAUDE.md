# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Monorepo Commands (from root)
- `yarn build` - Build all packages
- `yarn build:packages` - Build only publishable packages
- `yarn test` - Run tests across all packages
- `yarn lint` - Run linting across all packages
- `yarn dev` - Start playground development server

### CSM SDK Package Commands (from packages/csm-sdk)
- `yarn build` - Full build process (clean + build CJS, ESM, and types)
- `yarn build:cjs` - Build CommonJS distribution
- `yarn build:esm` - Build ES modules distribution
- `yarn build:types` - Build TypeScript declaration files
- `yarn clean` - Remove dist directory
- `yarn types` - TypeScript type checking without emitting files
- `yarn test` - Run Jest tests
- `yarn lint` - Run ESLint with TypeScript support (max 0 warnings)

### Development Workflow
After implementing changes: `yarn build && yalc push` (from csm-sdk directory) to update package in dependent projects

## Architecture Overview

### Core Structure
The SDK follows a modular architecture centered around the `LidoSDKCsm` class, which aggregates specialized modules for different aspects of the Lido Community Staking Module (CSM) ecosystem.

### Main Entry Point
- `packages/csm-sdk/src/lido-sdk-csm.ts` - Main SDK class that instantiates and manages all sub-modules
- `packages/csm-sdk/src/index.ts` - Primary export file with re-exports from all modules

### Module Organization
Each module follows a consistent pattern:
- `{module-name}-sdk.ts` - Main SDK implementation
- `types.ts` - TypeScript type definitions
- `index.ts` - Module exports

Key modules include:
- **core-sdk** - Shared logic, configuration, and core utilities
- **module-sdk** - CSM status and share limit queries
- **operator-sdk** - Operator data management
- **keys-sdk** - Validator key management
- **keys-with-status-sdk** - Key tracking with status information
- **bond-sdk** - Operator bond balance management
- **rewards-sdk** - Reward distribution queries
- **strikes-sdk** - Operator penalty tracking
- **events-sdk** - Protocol event queries
- **accounting-sdk** - Balance and supply data
- **parameters-sdk** - Curve parameters access
- **frame-sdk** - Protocol frame configuration
- **roles-sdk** - Operator role management
- **spending-sdk** - Spending operation management
- **permissionless-gate-sdk** - Permissionless operator creation
- **ics-gate-sdk** - ICS (Independent Community Staker) entry points
- **deposit-queue-sdk** - Deposit queue pointers and batches
- **deposit-data-sdk** - Parse and validate deposit data JSON, check for duplicates and previously submitted keys
- **stealing-sdk** - EL rewards stealing penalty management
- **satellite-sdk** - Helper for querying operator IDs by address and reading deposit queue batches

### Common Infrastructure
- `packages/csm-sdk/src/common/` - Shared utilities, constants, and primitives
  - `class-primitives/` - Base classes including `CsmSDKModule` and `BusRegistry`
  - `constants/` - Contract addresses, roles, and other constants
  - `utils/` - Helper functions for data parsing and manipulation
  - `decorators/` - Method decorators for caching, logging, and error handling

### Key Dependencies
- **@lidofinance/lido-ethereum-sdk** - Core Lido SDK (peer dependency)
- **viem** - Ethereum client library (peer dependency)
- **@openzeppelin/merkle-tree** - Merkle tree operations
- **zod** - Runtime type validation

### ABI Management
- `packages/csm-sdk/src/abi/` - Contract ABI definitions for all CSM contracts

### Configuration
All modules accept `CsmCoreProps` which includes:
- `core: LidoSDKCore` - Core SDK instance
- `overridedAddresses?: CSM_ADDRESSES` - Custom contract addresses
- `maxEventBlocksRange?: number` - Event query range limits
- `clApiUrl?: string` - Consensus layer API URL

### Transaction Handling
The SDK provides a sophisticated transaction handling system with:
- Transaction callbacks for monitoring progress
- Gas limit estimation
- Permit signature support
- Multi-stage transaction lifecycle tracking

### Testing
- Jest configuration in `jest.config.ts`
- Tests can be run with `yarn test`