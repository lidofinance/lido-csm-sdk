# Lido CSM SDK

[![GitHub license](https://img.shields.io/github/license/lidofinance/lido-csm-sdk?color=limegreen)](https://github.com/lidofinance/lido-csm-sdk/blob/main/LICENSE.txt)
[![Version npm](https://img.shields.io/npm/v/@lidofinance/lido-csm-sdk?label=version)](https://www.npmjs.com/package/@lidofinance/lido-csm-sdk)
[![npm bundle size](https://img.shields.io/bundlephobia/min/@lidofinance/lido-csm-sdk)](https://bundlephobia.com/package/@lidofinance/lido-csm-sdk)

## Overview

**Lido CSM SDK** is a TypeScript/JavaScript library that provides a comprehensive set of tools for interacting with [Lido Community Staking Module (CSM)](https://github.com/lidofinance/community-staking-module) contracts on the Ethereum network. The SDK abstracts the complexity of direct contract interaction, offering a modular, extensible, and developer-friendly interface for building applications on top of Lido CSM.

## Features
- Modular SDKs for all major Lido CSM contract domains
- Unified entry point via the `LidoSDKCsm` class
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

```typescript
import { LidoSDKCsm } from '@lidofinance/lido-csm-sdk';

const core = new LidoSDKCore({
  // Provide required core properties, e.g. provider, network, etc.
})

const sdk = new LidoSDKCsm({ core });

// Access different modules
const operatorsCount = await sdk.module.getOperatorsCount();
const operator = await sdk.operator.getInfo(69n);
```

## SDK Modules

The `LidoSDKCsm` class aggregates the following modules, each responsible for a specific domain of the Lido CSM ecosystem:

- **core**: Core SDK for shared logic, configuration, and utilities.
- **spending**: Manage and query spending operations.
- **module**: Query CSM status, share limit.
- **accounting**: Access accounting data such as balances and supply.
- **parameters**: Read a curve parameters.
- **frame**: Query protocol frame config and state.
- **operator**: Query operator data.
- **rewards**: Query reward distribution and queries.
- **strikes**: Query operator strikes.
- **keysWithStatus**: Query operator keys with status tracking.
- **keys**: Manage operator keys.
- **bond**: Manage operator bond balance.
- **roles**: Manage operator roles.
- **permissionlessGate**: Permissionless entry points for create a new operator.
- **icsGate**: ICS (Independent Community Staker) vetted entry point for create a new operations with some benefits.
- **events**: Query protocol events.
- **depositQueue**: Query deposit queue pointers, batches.
- **depositData**: Parse and validate deposit data JSON, check for duplicates and previously submitted keys.
- **stealing**: Manage execution layer rewards stealing penalties - report and cancel penalties.
- **satellite**: Helper to simprify query operator IDs by address and read deposit queue batches.

Each module exposes a set of methods tailored to its domain. Refer to the source code or generated API documentation for detailed method signatures and usage.

## Extending and Integrating

The SDK is designed for extensibility. You can instantiate individual modules directly or extend them for custom use cases. All modules share a common set of core properties for seamless integration.

## License

This project is licensed under the MIT License. See the [LICENSE.txt](LICENSE.txt) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.
