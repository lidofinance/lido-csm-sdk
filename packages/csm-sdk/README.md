# Lido CSM SDK

[![GitHub license](https://img.shields.io/github/license/lidofinance/lido-csm-sdk?color=limegreen)](https://github.com/lidofinance/lido-csm-sdk/blob/main/LICENSE.txt)
[![Version npm](https://img.shields.io/npm/v/@lidofinance/lido-csm-sdk?label=version)](https://www.npmjs.com/package/@lidofinance/lido-csm-sdk)
[![npm bundle size](https://img.shields.io/bundlephobia/min/@lidofinance/lido-csm-sdk)](https://bundlephobia.com/package/@lidofinance/lido-csm-sdk)

## Overview

**Lido CSM SDK** is a TypeScript/JavaScript library that provides comprehensive tools for interacting with [Lido Community Staking Module (CSM)](https://github.com/lidofinance/community-staking-module) and Curated Module (CM) contracts on the Ethereum network. The SDK abstracts the complexity of direct contract interaction, offering a modular, extensible, and developer-friendly interface for building applications on top of Lido staking modules.

## Features
- Modular SDKs for all major Lido staking module contract domains
- Dual SDK classes: `LidoSDKCsm` for CSM and `LidoSDKCm` for Curated Module
- TypeScript support and type safety
- Extensible architecture for advanced integrations

## Installation

Install via npm or yarn:

```bash
yarn add @lidofinance/lido-csm-sdk @lidofinance/lido-ethereum-sdk viem
```

or

```bash
npm install @lidofinance/lido-csm-sdk @lidofinance/lido-ethereum-sdk viem
```

## Usage Example

### Community Staking Module (CSM)

```typescript
import { LidoSDKCsm } from '@lidofinance/lido-csm-sdk';
import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';

const core = new LidoSDKCore({
  // Provide required core properties, e.g. provider, network, etc.
})

const csmSdk = new LidoSDKCsm({ core });

// Access different modules
const operatorsCount = await csmSdk.module.getOperatorsCount();
const operator = await csmSdk.operator.getInfo(69n);

// CSM-specific features
await csmSdk.permissionlessGate.createNodeOperator(...);
```

### Curated Module (CM)

```typescript
import { LidoSDKCm } from '@lidofinance/lido-csm-sdk';

const cmSdk = new LidoSDKCm({ core });

// Access different modules (same interface as CSM)
const operatorsCount = await cmSdk.module.getOperatorsCount();
const operator = await cmSdk.operator.getInfo(69n);

// CM-specific features
await cmSdk.curatedGates.createNodeOperator(gateIndex, proof, ...);
await cmSdk.operatorsData.set(operatorId, { name, description });
```

## SDK Modules

The SDK provides two classes: **`LidoSDKCsm`** for Community Staking Module and **`LidoSDKCm`** for Curated Module. Each class aggregates modules tailored to their specific module type, with many modules shared between both.

### Shared Modules

These modules are available in both `LidoSDKCsm` and `LidoSDKCm`:

- **core**: Core SDK for shared logic, configuration, and utilities
- **tx**: Unified transaction handling with multi-wallet support (EOA, multisig, Abstract Accounts), permit/approve flow, and batch operations
- **module**: Query module status, share limit
- **accounting**: Access accounting data such as balances and supply
- **parameters**: Read curve parameters
- **frame**: Query protocol frame config and state
- **operator**: Query operator data
- **rewards**: Query reward distribution
- **keysWithStatus**: Query operator keys with status tracking
- **keys**: Manage operator keys
- **keysCache**: Pubkey caching to prevent double-submission with 2-week TTL and manual key management
- **bond**: Manage operator bond balance
- **events**: Query protocol events
- **depositQueue**: Query deposit queue pointers, batches
- **depositData**: Parse and validate deposit data JSON, check for duplicates and previously submitted keys
- **feesMonitoring**: Validator fee recipient monitoring and issue detection
- **discovery**: Operator discovery and pagination using SMDiscovery contract (renamed from satellite-sdk)

### CSM-Specific Modules

Only available in `LidoSDKCsm`:

- **strikes**: Query operator penalties
- **stealing**: Manage execution layer rewards stealing penalties - report and cancel penalties
- **permissionlessGate**: Permissionless entry point for creating new operators
- **icsGate**: ICS (Independent Community Staker) vetted entry point for creating new operators with benefits
- **roles**: Standard role management for CSM operators

### CM-Specific Modules

Only available in `LidoSDKCm`:

- **curatedGates**: Collection of curated gates for allowlist-based operator creation using merkle proofs
- **operatorsData**: Module-agnostic operator metadata management (name, description)
- **roles**: Curated-specific role management (CuratedRolesSDK) with extended functionality

Each module exposes a set of methods tailored to its domain. Refer to the source code or generated API documentation for detailed method signatures and usage.

## Extending and Integrating

The SDK is designed for extensibility. You can instantiate individual modules directly or extend them for custom use cases. All modules share a common set of core properties for seamless integration.

## License

This project is licensed under the MIT License. See the [LICENSE.txt](LICENSE.txt) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.
