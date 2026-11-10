# Lido CSM SDK

[![GitHub license](https://img.shields.io/github/license/lidofinance/lido-csm-sdk?color=limegreen)](https://github.com/lidofinance/lido-csm-sdk/blob/main/LICENSE.txt)
[![Version npm](https://img.shields.io/npm/v/@lidofinance/lido-csm-sdk?label=version)](https://www.npmjs.com/package/@lidofinance/lido-csm-sdk)
[![npm bundle size](https://img.shields.io/bundlephobia/min/@lidofinance/lido-csm-sdk)](https://bundlephobia.com/package/@lidofinance/lido-csm-sdk)

## Overview

**Lido CSM SDK** is a TypeScript/JavaScript library that provides comprehensive tools for interacting with [Lido Community Staking Module (CSM)](https://github.com/lidofinance/staking-modules) and Curated Module (CM) contracts on the Ethereum network. The SDK abstracts the complexity of direct contract interaction, offering a modular, extensible, and developer-friendly interface for building applications on top of Lido staking modules.

## Features
- Modular SDKs for all major Lido staking module contract domains
- SDK classes per module: `LidoSDKCsm` (CSM), `LidoSDKCsm02` (CSM v2), `LidoSDKCm` (Curated Module), plus `LidoSmSDK`, a registry over every module deployed on the connected chain
- TypeScript support and type safety
- Extensible architecture for advanced integrations

## Installation

Requires **Node.js >= 24**, `@lidofinance/lido-ethereum-sdk >= 4.8.0`, and `viem >= 2.46.0` (peer dependencies).

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
await csmSdk.permissionlessGate.addNodeOperator({ token, amount, depositData });
```

### Curated Module (CM)

```typescript
import { LidoSDKCm } from '@lidofinance/lido-csm-sdk';

const cmSdk = new LidoSDKCm({ core });

// Access different modules (same interface as CSM)
const operatorsCount = await cmSdk.module.getOperatorsCount();
const operator = await cmSdk.operator.getInfo(69n);

// CM-specific features
await cmSdk.curatedGates.createNodeOperator({
  gateName: 'curatedGatePO',
  name,
  description,
  managerAddress,
  rewardAddress,
  proof,
});
await cmSdk.metaRegistry.setOperatorInfo({ nodeOperatorId, name, description });
```

### Gas estimation

Every write has an `estimate*` sibling taking the same props (`bond.estimateAddBond`, `keys.estimateAddKeys`, …). It signs and sends nothing and never fires `callback`.

```typescript
const { main, unlock, total, walletKind } = await csmSdk.bond.estimateAddBond({
  token: TOKENS.steth,
  nodeOperatorId: 69n,
  amount: parseEther('1'),
  account, // required unless the wallet client already has an account; never prompts
});
// unlock: { kind: 'permit', gas } for EOA, { kind: 'approve', gas } for multisig / Safe batch / atomic batch, absent if allowance suffices
```

- Throws `SDKError` like the write would — a revert (`CONTRACT_REVERT` + `decodedRevert`) means the tx would fail, so it doubles as a pre-flight check.
- `main` is the raw `eth_estimateGas` result (no padding); `permit` gas is a fixed approximation (`PERMIT_GAS_OVERHEAD`, same token bytecode on every supported chain, pinned within 15% by an integration test), not a live estimate.
- When allowance is missing, the main call is estimated with an `eth_estimateGas` `stateOverride` of the token allowance. Each call verifies the override took effect: if the RPC ignored it or the token's allowance slot differs → `NOT_SUPPORTED`; if it applied but the call needs more than the spend amount, the original revert is rethrown; an RPC that rejects the param → RPC error.
- `unlock` is present iff the user still has to sign a permit or send an approve; with a caller-supplied permit its cost is already inside `main`. For multisig, `total` sums two separate Safe txs (approve sent first; `perform` returns `{ hash }` and the caller re-invokes); for `multisigBatch` it is one Safe tx (approve + call in a MultiSend).
- `from` must hold the ETH/tokens being spent (no balance override). No fee fields are sent, so "not enough ETH for gas" isn't detected.
- Multisig / atomic-batch numbers are approximations: no Safe/EntryPoint wrapper overhead, and gas may be sponsored.

### Safe wallets

A Safe whose provider advertises EIP-5792 (`walletKind: 'multisigBatch'`; Safe{Wallet} iframe and WalletConnect web) gets **one** Safe transaction: approve (if needed) + call are proposed together via `wallet_sendCalls`. `perform` returns `{ hash }` right after the proposal and fires `SIGN` → `MULTISIG_DONE`.

- `hash` (return value and `MULTISIG_DONE.payload.hash`) is a **Safe transaction hash** on the batched (EIP-5792) path, not an Ethereum tx hash — don't pass it to `waitForTransactionReceipt`; track execution via the Safe tx service or `wallet_getCallsStatus`.
- `MULTISIG_DONE.payload.approve` is set by `perform`/`signPermitOrApprove` when only the approve step was sent and the main call is pending (Safe without EIP-5792, or `signPermitOrApprove`, which stays 2-step by design): re-invoke after it executes. Absent ⇒ done.
- Migration: drop "`isMultisig()` ⇒ sign twice" UX; use `getWalletKind()` / `estimate*().walletKind` or `MULTISIG_DONE.payload.approve`.
- Limitation (unverified): a Safe-4337 account whose provider advertises `atomic` is treated as `multisigBatch` — no receipt, no `decodeResult` (e.g. `nodeOperatorId` from gate `createNodeOperator`, bond/roles results). The tx still executes.

## SDK Modules

The SDK provides **`LidoSDKCsm`** (Community Staking Module), **`LidoSDKCsm02`** (CSM v2) and **`LidoSDKCm`** (Curated Module). Each class aggregates modules tailored to its module type, with many modules shared. `LidoSmSDK` registers every module deployed on the connected chain:

```typescript
const sm = new LidoSmSDK({ core });
sm.csm?.strikes;
sm.get(MODULE_NAME.CM)?.metaRegistry;
sm.require(MODULE_NAME.CSM_02); // throws NOT_SUPPORTED if absent
```

### Shared Modules

These modules are available in `LidoSDKCsm`, `LidoSDKCsm02` and `LidoSDKCm`, except `depositQueue` (CSM and CSM v2 only):

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
- **roles**: Role management
- **events**: Query protocol events
- **depositQueue**: Query deposit queue pointers, batches (CSM and CSM v2 only)
- **depositData**: Parse and validate deposit data JSON, check for duplicates and previously submitted keys
- **feesMonitoring**: Validator fee recipient monitoring and issue detection
- **discovery**: Operator discovery and pagination using SMDiscovery contract (renamed from satellite-sdk)
- **delayedPenalty**: General delayed penalty management — report, cancel, and settle delayed penalties (renamed from stealing-sdk, generalized to match contract `GeneralDelayedPenalty` surface)

### CSM-Specific Modules

Only available in `LidoSDKCsm` (`LidoSDKCsm02` has `strikes`, `permissionlessGate` and `depositQueue`):

- **strikes**: Query operator penalties
- **permissionlessGate**: Permissionless entry point for creating new operators
- **icsGate**: ICS (Independent Community Staker) vetted entry point for creating new operators with benefits
- **idvtcGate**: IDVTC vetted entry point for creating new operators

### CM-Specific Modules

Only available in `LidoSDKCm`:

- **curatedGates**: Collection of curated gates for allowlist-based operator creation using merkle proofs
- **metaRegistry**: Operator metadata management (name, description) via MetaRegistry contract

Each module exposes a set of methods tailored to its domain. Refer to the source code or generated API documentation for detailed method signatures and usage.

## Extending and Integrating

The SDK is designed for extensibility. You can instantiate individual modules directly or extend them for custom use cases. All modules share a common set of core properties for seamless integration.

## License

This project is licensed under the GPL-3.0-or-later License. See the [LICENSE.txt](LICENSE.txt) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.
