# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Core package for the monorepo. Defines all shared interfaces, types, helpers, and base service implementations consumed by every blockchain-specific package.

## Commands

```bash
rushx build       # Compile TypeScript
rushx test        # Run tests (Vitest)
rushx lint        # Lint
rushx typecheck   # Type-check without emit
```

Run a single test file:
```bash
rushx test src/__tests__/BSBigNumberHelper.spec.ts
```

## Structure

```
src/
├── __tests__/          # Unit tests for helpers
├── constants/          # BSCommonConstants
├── helpers/
│   ├── BSAccountHelper             # Key/account generation (BIP39/BIP44)
│   ├── BSBigNumberHelper           # Arithmetic with bignumber.js
│   ├── BSFullTransactionsByAddressHelper
│   ├── BSKeychainHelper            # Encryption/decryption utilities
│   └── BSUtilsHelper               # Misc utilities (address validation, etc.)
├── services/
│   ├── exchange-data/              # CryptoCompareEDS, FlamingoForthewinEDS
│   ├── token/                      # TokenService (base)
│   └── nft-data/                   # GhostMarketNDS
├── interfaces.ts       # All core interfaces and capability mixin types
├── functions.ts        # Type guard functions
├── error.ts            # BSError custom error class
├── types.ts            # Shared types
└── index.ts
```

## Architecture

### Core interface

`IBlockchainService<N extends string, A extends string = string>` is the central contract. `N` is the blockchain name literal (e.g. `'neo3'`), `A` is the network ID literal (e.g. `'mainnet'`).

### Capability mixins

Optional capability interfaces follow the `IBSWith*` naming convention and are checked at runtime using the type guards in `functions.ts`:

| Interface | Type guard | Capability |
|---|---|---|
| `IBSWithEncryption<N>` | `hasEncryption` | Encrypt/decrypt keys |
| `IBSWithFee<N>` | `hasFee` | Fee calculation |
| `IBSWithClaim<N>` | `isClaimable` | Token claiming (NEO) |
| `IBSWithNameService` | `hasNameService` | Domain name resolution |
| `IBSWithExplorer` | `hasExplorer` | Block explorer URLs |
| `IBSWithLedger<N>` | `hasLedger` | Ledger hardware wallet |
| `IBSWithNft` | `hasNft` | NFT data |
| `IBSWithWalletConnect<N>` | `hasWalletConnect` | WalletConnect |
| `IBSWithFullTransactions<N>` | `hasFullTransactions` | Full tx history |

### Key types

- `TBSAccount<N>` — address, key, BIP path, type (`'wif'|'privateKey'`), hardware flag
- `TBSToken` — symbol, name, hash, decimals, network, blockchain
- `TBSNetwork<A>` — id, name, url, type (`'mainnet'|'testnet'|'custom'`)
- `TTransaction<N>` — union of `TTransactionDefault<N>` and `TTransactionUTXO<N>` (Bitcoin)
- `TTransferParams<N>` — sender account, intents array, priorityFee, tipIntent

### Sub-service interfaces

Each blockchain service is composed of these service contracts:
- `IBlockchainDataService<N>` — balances, transactions, contracts, blocks
- `IExchangeDataService` — token prices, currency ratios
- `ITokenService` — token validation and metadata
- `INftDataService` — NFT collections and items
- `IExplorerService` — explorer URL builders
- `ILedgerService<N>` — Ledger HW wallet signing
- `IWalletConnectService<N>` — WalletConnect protocol handling
- `IClaimService<N>` — claim GAS/rewards
- `IVoteService<N>` — voting (NEO)
- `ITrustlineService` — trustline management (Stellar)
- `IBridgeOrchestrator` — cross-chain bridge
- `ISwapOrchestrator` — token swap
