# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Solana blockchain service supporting SOL transfers and SPL token operations.

## Commands

```bash
rushx build
rushx test
rushx test src/__tests__/BSSolana.spec.ts  # single file
rushx lint
rushx typecheck
```

## Structure

```
src/
├── __tests__/              # 6 test files
├── constants/              # BSSolanaConstants (networks, tokens)
├── services/
│   ├── blockchain-data/        # RpcBDSSolana (RPC-based)
│   ├── exchange/               # MoralisEDSSolana
│   ├── explorer/               # SolScanExplorerService
│   ├── ledger/                 # Web3LedgerServiceSolana
│   ├── nft-data/               # RpcNftDataServiceSolana
│   ├── token/                  # TokenServiceSolana
│   └── wallet-connect/         # WalletConnectServiceSolana
├── types.ts                # Solana-specific RPC response shapes
├── BSSolana.ts             # Main class
└── index.ts
```

## Architecture

**Key library:** `@solana/kit` — the modern Solana web3 toolkit used for RPC calls and transaction building.

**Token programs:** Uses `@solana-program/system` (SOL transfers) and `@solana-program/token` (SPL token transfers). Transaction building composes instructions from these programs.

**Key format:** Solana uses Ed25519 keys — 64-byte keypairs. `BSSolana` handles this difference from the 32-byte keys common to EVM/NEO chains.

**Multi-transfer:** Supported (`isMultiTransferSupported = true`) — multiple token intents can be batched in one transaction using instruction composition.

**Hardware wallets:** `@ledgerhq/hw-app-solana` via `Web3LedgerServiceSolana`.

**Data provider:** Direct Solana RPC for blockchain data; Moralis for exchange rates.
