# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Cross-chain aggregator. Composes multiple blockchain services into a single unified interface and implements multi-chain features: token swaps (unified multi-provider swap backend), Neo3↔NeoX bridging, and multi-chain WalletConnect.

## Commands

```bash
rushx build
rushx test
rushx test src/__tests__/SwapOrchestrator.spec.ts  # single file
rushx lint
rushx typecheck
```

## Structure

```
src/
├── __tests__/              # 4 test files
├── features/
│   ├── swap/
│   │   ├── SwapApi.ts                # HTTP client for the unified swap backend
│   │   ├── SwapHelper.ts             # Chain/token mapping between services and the swap backend
│   │   ├── SwapOrchestrator.ts       # State machine for swap flow
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

Both `SwapOrchestrator` and `Neo3NeoXBridgeOrchestrator` implement a state machine:
- State is stored internally and changes emitted via EventEmitter
- Consumers subscribe to state changes to track multi-step operation progress
- States progress through initialization → execution → confirmation → completion (or error)

### Swap integration

`SwapApi` is a typed HTTP client for the dora-proxies unified swap backend (`${COZ_API_URL}/v2/p/swap`), which aggregates multiple providers (SimpleSwap, SwapKit, ...) behind one API: destinations → quotes → orders → step transactions. `SwapOrchestrator` consumes it and executes the order steps:
- `deposit_order` family: transfers `tokenToUse` to the provider deposit address via `service.transfer`
- `route_payload` family: signs and broadcasts each step's tx payload via `IBSWithTransactionPayload.sendTransactionPayload` (EVM) and reports each tx hash back to the backend
- Each `SwapApi` instance generates a correlation ID (or reuses one passed to its constructor) and sends it as the `X-Correlation-Id` header on every request. One per `SwapOrchestrator`, returned in `TSwapResult.correlationId`; pass it to `SwapOrchestrator.getOrder(id, bsAggregator, correlationId)` (returns a full `TSwapResult` built from the order) to keep tracking calls in the same session
- `SwapOrchestrator.getOrdersByAddress({ address, limit?, offset? }, correlationId?)` lists the order summaries (`orderId` + `sourceTxHash`) of a source address, newest first. Backend endpoint not deployed yet: `SwapApi.getOrdersByAddress` returns mocked data

### WalletConnect multi-chain

`WalletKitHelper` wraps `@walletconnect/utils` and handles session management across all registered blockchain services simultaneously.

### Workspace dependencies

This package depends on `blockchain-service` and all `bs-*` packages as regular `dependencies`: they are used for type-level generics and some features need them at runtime (e.g. the swap uses `BSEthereum`). Service instances are still created and passed in by the consumer.
