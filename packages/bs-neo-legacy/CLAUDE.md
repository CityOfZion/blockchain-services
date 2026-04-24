# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

NEO Legacy (NEO v2 / N2) blockchain service for backward compatibility with the older NEO network.

## Commands

```bash
rushx build
rushx test
rushx test src/__tests__/BSNeoLegacy.spec.ts  # single file
rushx lint
rushx typecheck
```

## Structure

```
src/
├── __tests__/              # 7 test files
├── constants/              # BSNeoLegacyConstants
├── helpers/
│   ├── BSNeoLegacyHelper                   # Address/key utilities
│   └── BSNeoLegacyNeonJsSingletonHelper    # Singleton neon-js v4 instance
├── services/
│   ├── blockchain-data/        # DoraBDS (legacy endpoints)
│   ├── exchange-data/          # CryptoCompareEDS
│   ├── explorer/               # NeoTubeExplorerService
│   ├── full-transactions-data/ # DoraFullTransactionsData
│   ├── ledger/                 # NeonJsLedgerService
│   ├── claim/                  # ClaimServiceNeoLegacy
│   └── token/                  # TokenServiceNeoLegacy
├── types.ts
├── BSNeoLegacy.ts          # Main class
└── index.ts
```

## Architecture

`BSNeoLegacy` uses `@cityofzion/neon-core` and `@cityofzion/neon-api` **v4.8.x**, aliased as `neon-core-legacy` / `neon-api-legacy` to avoid conflicts with `bs-neo3` which uses v5. Do not conflate the two — the APIs differ significantly.

**Transaction size limits:** The legacy network has a maximum transaction size. `BSNeoLegacy` has private methods (`_hasTransactionMoreThanMaxSize`, `_getRequiredTransactionFeeConfig`) to split or adjust fees for oversized transactions.

**Signing callback:** Supports a `signingCallback` parameter on transfer, allowing external signing (e.g. Ledger).

**Claim service:** GAS claiming uses legacy network mechanics — different from NEO N3 claiming.

**No WalletConnect, no NFT, no voting** — these capabilities were added in NEO N3.
