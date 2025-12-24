# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development

- `yarn build` - Full build process (clean + build CJS, ESM, and types)
- `yarn build:cjs` - Build CommonJS distribution
- `yarn build:esm` - Build ES modules distribution
- `yarn build:types` - Build TypeScript declaration files
- `yarn clean` - Remove dist directory
- `yarn types` - TypeScript type checking without emitting files

### Testing and Quality

- `yarn test` - Run Jest tests
- `yarn lint` - Run ESLint with TypeScript support (max 0 warnings)

## Architecture Overview

### Core Structure

The SDK follows a modular architecture centered around the `LidoSDKCsm` class, which aggregates specialized modules for different aspects of the Lido Community Staking Module (CSM) ecosystem.

### Main Entry Point

- `src/lido-sdk-csm.ts` - Main SDK class that instantiates and manages all sub-modules
- `src/index.ts` - Primary export file with re-exports from all modules

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
- **fees-monitoring-sdk** - Validator fee recipient monitoring and issue detection

### Common Infrastructure

- `src/common/` - Shared utilities, constants, and primitives
  - `class-primitives/` - Base classes including `CsmSDKModule` and `BusRegistry`
  - `constants/` - Contract addresses, roles, and other constants
  - `utils/` - Helper functions for data parsing and manipulation
  - `decorators/` - Method decorators for caching, logging, and error handling

### Decorator Order Convention

**Standard order (outermost to innermost):** `@Logger → @ErrorHandler → @Cache`

```typescript
@Logger('Views:')      // Outermost - logs all calls (including cache hits)
@ErrorHandler()        // Middle - catches and transforms errors
@Cache(CACHE_SHORT)    // Innermost - checks/stores cache
public async getInfo(id: NodeOperatorId): Promise<NodeOperatorInfo>
```

**Why this order:**

- Decorators execute **bottom-to-top** (innermost first)
- Logger tracks all calls for debugging/monitoring (executes first)
- ErrorHandler catches errors from both cache and method execution
- Cache only stores successful results (uses `.then()` without `.catch()`)
- Errors are never cached regardless of decorator order

**Benefits:**

- Consistent logging for cache hit rate monitoring
- Clear error handling boundaries
- Prevents caching of error states

### Key Dependencies

- **@lidofinance/lido-ethereum-sdk** - Core Lido SDK (peer dependency)
- **viem** - Ethereum client library (peer dependency)
- **@openzeppelin/merkle-tree** - Merkle tree operations
- **zod** - Runtime type validation

### ABI Management

- `src/abi/` - Contract ABI definitions for all CSM contracts

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
