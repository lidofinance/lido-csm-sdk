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
- **keys-cache-sdk** - Pubkey caching to prevent double-submission with 2-week TTL and manual key management
- **bond-sdk** - Operator bond balance management
- **rewards-sdk** - Reward distribution queries
- **strikes-sdk** - Operator penalty tracking
- **events-sdk** - Protocol event queries
- **accounting-sdk** - Balance and supply data
- **parameters-sdk** - Curve parameters access
- **frame-sdk** - Protocol frame configuration
- **roles-sdk** - Operator role management
- **tx-sdk** - Unified transaction handling layer with Abstract Account (AA) support (replaces deprecated spending-sdk)
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

### BusRegistry & Inter-Module Communication
The **BusRegistry** provides type-safe inter-module communication with a Proxy-based design:

#### Architecture
- **Proxy Pattern**: BusRegistry constructor returns a Proxy that intercepts property access
- **Direct Property Access**: Enables `bus.moduleName.method()` instead of `bus.get('moduleName')?.method()`
- **Type Safety**: Generic typing ensures TypeScript knows which modules are available
- **Self-Registration**: Modules auto-register when passing a name to CsmSDKModule constructor

#### How It Works
1. **BusRegistry** (`bus-registry.ts`):
   - Constructor returns Proxy wrapping the instance
   - Proxy intercepts property access, checking:
     - First: BusRegistry methods (`register`, `get`, `getOrThrow`)
     - Then: Registered modules from internal registry
   - Typed via `BusRegistry<TModules>` generic

2. **CsmSDKModule** (`csm-sdk-module.ts`):
   - Base class for all SDK modules
   - Accepts optional `bus` parameter (creates new if not provided)
   - Self-registers if `name` provided: `new ModuleSDK(props, 'moduleName')`
   - Typed via generic: `extends CsmSDKModule<{ dep1: DepSDK, dep2: DepSDK }>`

3. **LidoSDKCsm** (`lido-sdk-csm.ts`):
   - Creates single shared BusRegistry
   - Passes bus to all modules via `commonProps`
   - Modules auto-register during construction

#### Usage Examples
```typescript
// Module with dependencies declared via generic
export class OperatorSDK extends CsmSDKModule<{ parameters: ParametersSDK }> {
  async method() {
    // Direct property access via Proxy
    const config = await this.bus.parameters.getQueueConfig(curveId);
  }
}

// Optional dependencies (module may not be registered)
export class DepositDataSDK extends CsmSDKModule<{
  keysWithStatus?: KeysWithStatusSDK;
  keysCache?: KeysCacheSDK;
}> {
  async method(pubkeys: Hex[]) {
    // Use optional chaining for modules that might not exist
    const keys = await this.bus.keysWithStatus?.getApiKeys(pubkeys);
    const isDuplicate = this.bus.keysCache?.isDuplicate(pubkey);
  }
}
```

#### Key Benefits
- **Type-safe**: TypeScript enforces available modules and their methods
- **Clean syntax**: Natural property access instead of getter methods
- **Dependency injection**: No circular dependencies between modules
- **Optional dependencies**: Flexible module composition with `?` operator

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

### Transaction System (tx-sdk)
The **tx-sdk** module provides unified transaction handling across different wallet types, replacing the deprecated **spending-sdk** module.

#### Purpose
- Unified API for transactions across EOA, multisig, and Abstract Account wallets
- Automatic wallet type detection and appropriate flow selection
- Built-in permit/approve handling for token spending
- Support for EIP-5792 batch transactions (sendCalls) for Abstract Accounts

#### Wallet Type Support
1. **EOA (Externally Owned Accounts)**: Standard wallets with permit signature support
2. **Multisig Wallets**: Contract-based wallets requiring explicit approve transactions
3. **Abstract Accounts (AA)**: Smart contract wallets supporting EIP-5792 batch operations via `sendCalls`

#### Transaction Flow
The tx-sdk automatically detects wallet type and routes to the appropriate flow:
- **EOA wallets**: Permit signature → Transaction
- **Multisig wallets**: Approve transaction → Main transaction
- **Abstract Accounts**: Batch operations via `sendCalls` (single transaction for approve + main operation)

#### Core API
The primary method is `tx.perform()` which handles all transaction types:

```typescript
return this.bus.tx.perform({
  account,           // User's wallet address
  callback,          // Optional transaction lifecycle callbacks
  spend: {           // Optional spending configuration
    token: TOKENS.steth,
    amount,
    permit           // Optional permit preferences
  },
  call: ({ permit }) => prepCall(contract, 'method', [args]),
  decodeResult: (receipt) => parseReceiptData(receipt),
});
```

#### Helper Utilities

**prepCall**: Type-safe utility for preparing contract calls
```typescript
// Non-payable function
prepCall(contract, 'transfer', [address, amount])

// Payable function (value required as 3rd argument)
prepCall(contract, 'deposit', [operatorId], value)
```

**Other helpers**:
- `allowance(account, spender, token)` - Check ERC20 token allowance
- `checkAllowance(account, spender, amount, token)` - Determine if approval needed
- `signPermit(account, spender, amount, token, deadline)` - Sign EIP-2612 permit
- `approve(account, spender, amount, token, callback)` - Execute approve transaction

#### Transaction Lifecycle Callbacks
The tx-sdk provides detailed transaction lifecycle tracking via callbacks:
- `PERMIT_SIGN` - Signing permit for gasless approval
- `APPROVE_SIGN` - Signing approval transaction
- `APPROVE_RECEIPT` - Approval transaction confirmed
- `GAS_LIMIT` - Gas estimation complete
- `SIGN` - Signing main transaction
- `RECEIPT` - Waiting for transaction receipt
- `CONFIRMATION` - Transaction confirmed on chain
- `DONE` - Complete with decoded result
- `MULTISIG_DONE` - Multisig transaction submitted (not yet executed)
- `ERROR` - Error occurred

#### Architecture
- **tx-sdk.ts**: Main TxSDK class with perform() method and helpers
- **types.ts**: Type definitions for transaction operations
- **utils/**: Helper functions including prepCall and event parsing utilities

### Keys Cache System
The **keys-cache-sdk** module provides pubkey caching functionality to prevent double-submission:

#### Purpose
- Prevent accidental re-submission of the same validator pubkeys
- Manual key management with 2-week automatic expiration
- Optional integration with deposit data validation

#### Architecture
- **Storage Layer** (`storage.ts`): Low-level localStorage operations and utilities
- **Business Logic** (`keys-cache-sdk.ts`): High-level cache management in SDK class
- **Clean separation**: Storage utilities vs cache business logic

#### Key Features
- **Timestamp-based TTL**: 2-week expiration using timestamps (not block numbers)
- **Chain-specific storage**: localStorage keys include chainId (`lido-csm-keys-cache-${chainId}`)
- **Automatic cleanup**: Expired keys removed on every add/remove operation
- **Duplicate detection**: Integration with DepositDataSDK for validation

#### Usage Examples
```typescript
const sdk = new LidoSDKCsm({ core });

// Manual key management
sdk.keysCache.addPubkeys(['0x123...', '0x456...']);
sdk.keysCache.removePubkeys(['0x123...']);
sdk.keysCache.clearAllKeys();

// Check for duplicates
const isDuplicate = sdk.keysCache.isDuplicate('0x123...');
const hasCached = sdk.keysCache.hasCachedKey('0x123...');

// Get cache information
const cachedKeys = sdk.keysCache.getCachedKeys();
const stats = sdk.keysCache.getCacheStats(); // { count, oldestKey, newestKey }

// Automatic integration with deposit validation
const result = await sdk.depositData.validateDepositData(depositData);
// Will automatically check for cached duplicates and add valid keys to cache
```

### Testing
- Jest configuration in `jest.config.ts`
- Tests can be run with `yarn test`