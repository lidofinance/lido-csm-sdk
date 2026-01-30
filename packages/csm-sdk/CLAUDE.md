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

The SDK follows a modular architecture centered around the `LidoSDKCsm` and `LidoSDKCm` classes, which aggregate specialized modules for different aspects of the Lido Community Staking Module (CSM) and Curated Module (CM) ecosystems.

### Main Entry Point

- `src/lido-sdk-csm.ts` - CSM SDK class that instantiates and manages CSM-specific modules
- `src/lido-sdk-cm.ts` - CM SDK class that instantiates and manages CM-specific modules
- `src/index.ts` - Primary export file with re-exports from all modules

### Module Organization

Each module follows a consistent pattern:

- `{module-name}-sdk.ts` - Main SDK implementation
- `types.ts` - TypeScript type definitions
- `index.ts` - Module exports

Key modules include:

**Shared modules** (available in both CSM and CM):
- **core-sdk** - Shared logic, configuration, and core utilities
- **tx-sdk** - Unified transaction handling with Abstract Account support (replaces deprecated spending-sdk)
- **module-sdk** - Module status and share limit queries
- **operator-sdk** - Operator data management
- **keys-sdk** - Validator key management
- **keys-with-status-sdk** - Key tracking with status information
- **keys-cache-sdk** - Pubkey caching to prevent double-submission with 2-week TTL
- **bond-sdk** - Operator bond balance management
- **rewards-sdk** - Reward distribution queries
- **events-sdk** - Protocol event queries
- **accounting-sdk** - Balance and supply data
- **parameters-sdk** - Curve parameters access
- **frame-sdk** - Protocol frame configuration
- **deposit-queue-sdk** - Deposit queue pointers and batches
- **deposit-data-sdk** - Parse and validate deposit data JSON, check for duplicates and previously submitted keys
- **fees-monitoring-sdk** - Validator fee recipient monitoring and issue detection
- **discovery-sdk** - Operator discovery and pagination (renamed from satellite-sdk)

**CSM-specific modules**:
- **strikes-sdk** - Operator penalty tracking
- **stealing-sdk** - EL rewards stealing penalty management
- **permissionless-gate-sdk** - Permissionless operator creation
- **ics-gate-sdk** - ICS (Independent Community Staker) entry points
- **roles-sdk** - Standard role management for CSM operators

**CM-specific modules**:
- **curated-gate-sdk** - Single curated gate interface with merkle proofs
- **curated-gates-collection-sdk** - Multi-gate manager for operator creation
- **curated-roles-sdk** - CM-specific role management (extends RolesSDK)
- **operators-data-sdk** - Module-agnostic operator metadata management

### Common Infrastructure

- `src/common/` - Shared utilities, constants, and primitives
  - `class-primitives/` - Base classes including `CsmSDKModule` and `BusRegistry`
  - `constants/` - Contract addresses, roles, and other constants
  - `utils/` - Helper functions for data parsing and manipulation
  - `decorators/` - Method decorators for caching, logging, and error handling

### Dual SDK Classes

The SDK provides two separate classes for different module types:

#### LidoSDKCsm (Community Staking Module)
- **File**: `src/lido-sdk-csm.ts`
- **Purpose**: Permissionless and ICS operator entry
- **Module Count**: 21 modules
- **Unique Features**: strikes, stealing, permissionlessGate, icsGate

#### LidoSDKCm (Curated Module)
- **File**: `src/lido-sdk-cm.ts`
- **Purpose**: Gate-based allowlist operator entry
- **Module Count**: 17 modules
- **Unique Features**: curatedGates, operatorsData, CuratedRolesSDK

#### Module Availability

| Module | CSM | CM | Notes |
|--------|-----|----|----|
| Core & Tx | ✅ | ✅ | Shared infrastructure |
| Operator, Keys, Bond | ✅ | ✅ | Shared functionality |
| Strikes, Stealing | ✅ | ❌ | CSM-only penalties |
| PermissionlessGate, IcsGate | ✅ | ❌ | CSM-only entry |
| CuratedGates | ❌ | ✅ | CM-only allowlist |
| OperatorsData | ❌ | ✅ | CM-only metadata |
| Roles | Standard | Curated | Different implementations |

**Initialization:**

```typescript
// CSM: Permissionless/ICS operators
const csmSdk = new LidoSDKCsm({ core });

// CM: Curated operators with gates
const cmSdk = new LidoSDKCm({ core });
```

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
