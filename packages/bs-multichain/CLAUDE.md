# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Cross-chain aggregator. Composes multiple blockchain services into a single unified interface and implements multi-chain features: token swaps (SimpleSwap), Neo3↔NeoX bridging, and multi-chain WalletConnect.

## Commands

```bash
rushx build
rushx test
rushx test src/__tests__/SimpleSwapService.spec.ts  # single file
rushx lint
rushx typecheck
```

## Structure

```
src/
├── __tests__/              # 4 test files
├── features/
│   ├── swap/
│   │   ├── SimpleSwapApi.ts          # HTTP client for SimpleSwap API
│   │   ├── SimpleSwapService.ts      # High-level swap service
│   │   ├── SimpleSwapOrchestrator.ts # State machine for swap flow
│   │   └── types.ts
│   ├── bridge/
│   │   ├── Neo3NeoXBridgeOrchestrator.ts  # State machine for bridge flow
│   │   └── types.ts
│   └── wallet-connect/
│       ├── WalletKitHelper.ts        # WalletConnect multi-chain helper
│       └── types.ts
├── BSAggregator.ts         # Core aggregator class
├── types.ts
└── index.ts
```

## Architecture

### BSAggregator

`BSAggregator<S extends TBSService[], T>` takes an array of blockchain service instances and provides cross-chain operations:
- `validateAddress(address)` — checks address against all services
- `generateAccountFromMnemonic(mnemonic, index)` — derives accounts for all services
- `decryptKey(encryptedKey, password)` — decrypts across all services
- `getAccountFromEncryptedKey(key, password)` — resolves accounts across all services

Services are stored in a record keyed by blockchain name for O(1) lookup.

### Orchestrator pattern

Both `SimpleSwapOrchestrator` and `Neo3NeoXBridgeOrchestrator` implement a state machine:
- State is stored internally and changes emitted via EventEmitter
- Consumers subscribe to state changes to track multi-step operation progress
- States progress through initialization → execution → confirmation → completion (or error)

### SimpleSwap integration

`SimpleSwapApi` is a typed HTTP client wrapping the SimpleSwap DEX aggregator API. `SimpleSwapService` exposes a high-level interface consumed by `SimpleSwapOrchestrator`. This is independent of any specific blockchain — it routes through SimpleSwap's own liquidity.

### WalletConnect multi-chain

`WalletKitHelper` wraps `@walletconnect/utils` and handles session management across all registered blockchain services simultaneously.

### Workspace dependencies

This package depends on `blockchain-service` and lists all `bs-*` packages as `devDependencies` for type-level usage in generics. At runtime it receives service instances from the consumer.
