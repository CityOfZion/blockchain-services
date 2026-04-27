# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A TypeScript monorepo providing a unified abstraction layer for multiple blockchain technologies (NEO3, Ethereum, Solana, Bitcoin, Stellar, Neo X, etc.). All blockchains implement a single `IBlockchainService<N>` interface defined in `@cityofzion/blockchain-service`.

## Monorepo Setup

Managed with **Rush.js** + **pnpm**. Node.js version: **22.14.0** (see `.nvmrc`).

**Install dependencies:**
```bash
rush update
```

## Commands

### Root-level (all packages)
```bash
rush rebuild    # Full clean build (preferred over rush build)
rush lint       # Lint all packages
rush format     # Format all packages (eslint --fix)
```

### Per-package (from within a package directory)
```bash
cd packages/bs-ethereum
rushx build
rushx test
rushx lint
rushx format
rushx typecheck
```

### Run a single test file
```bash
cd packages/bs-ethereum
rushx test src/__tests__/BSEthereum.spec.ts
```

Test files live in `src/__tests__/*.spec.ts`. Vitest runs with a 60-second timeout and dotenv loaded automatically.

## Packages

| Package | Role |
|---|---|
| `blockchain-service` | Core interfaces, types, helpers — the contract all chains implement |
| `bs-ethereum` | EVM-compatible chains |
| `bs-neo3` | NEO 3 blockchain |
| `bs-neo-legacy` | NEO 2 (legacy) blockchain |
| `bs-neox` | Neo X blockchain |
| `bs-solana` | Solana |
| `bs-stellar` | Stellar |
| `bs-bitcoin` | Bitcoin |
| `bs-multichain` | Cross-chain feature implementations |
| `bs-electron` | Electron IPC bridge — exposes blockchain service API to renderer process |

## Architecture

### Core interface pattern

Each blockchain service is generic over its name type `N` (a string literal like `'ethereum'`) and optional network ID type `A`:

```typescript
interface IBlockchainService<N extends string, A extends string = string> {
  blockchainDataService: IBlockchainDataService<N>
  exchangeDataService: IExchangeDataService
  tokenService: ITokenService
  nftDataService?: INftDataService
  // ...
}
```

### Capability mixins

Services declare optional capabilities via extension interfaces:

- `IBSWithEncryption<N>` — encryption/decryption
- `IBSWithLedger<N>` — Ledger hardware wallet
- `IBSWithClaim<N>` — token claim (NEO-specific)
- `IBSWithNft` — NFT data
- `IBSWithExplorer` — block explorer URLs
- `IBSWithWalletConnect<N>` — WalletConnect protocol
- `IBSWithBridge` / `IBSWithSwap` — bridge and swap orchestration

### Key types

| Type | Description |
|---|---|
| `TBSAccount<N>` | Account with key, address, BIP44 path, hardware flag |
| `TBSToken` | Token metadata (symbol, name, hash, decimals) |
| `TBSNetwork<A>` | Network config (id, name, url, type) |
| `TTransaction<N>` | Transaction — default or UTXO view |
| `TTransferParams<N>` | Transfer intent with sender, recipients, tokens |

### Protected method convention

Methods prefixed with `_` (e.g., `_generateSigner`, `_buildTransferParams`) are considered protected. `bs-electron` automatically excludes them from the IPC-exposed API surface.

## Tech Stack

- **Language:** TypeScript 5.x (`strict: true`, `nodenext` modules, `ES2020` target)
- **Tests:** Vitest (globals enabled, no imports needed)
- **Linting:** ESLint 9 + typescript-eslint + Prettier
