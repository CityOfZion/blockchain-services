# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Stellar blockchain service with trustline management and Soroban smart contract support.

## Commands

```bash
rushx build
rushx test
rushx test src/__tests__/BSStellar.spec.ts  # single file
rushx lint
rushx typecheck
```

## Structure

```
src/
├── __tests__/              # 7 test files
├── constants/              # BSStellarConstants (networks, tokens)
├── services/
│   ├── blockchain-data/        # HorizonBDSStellar
│   ├── exchange/               # RpcEDSStellar
│   ├── explorer/               # StellarChainExplorerService
│   ├── ledger/                 # LedgerServiceStellar
│   ├── token/                  # TokenServiceStellar
│   ├── trustline/              # TrustlineServiceStellar
│   └── wallet-connect/         # WalletConnectServiceStellar
├── types.ts                # Stellar-specific types, Horizon API response shapes
├── BSStellar.ts            # Main class
└── index.ts
```

## Architecture

**Key library:** `@stellar/stellar-sdk` v14 — used for all Stellar operations.

**Dual server architecture:** `BSStellar` maintains two server clients:
- **Soroban RPC server** — smart contract interactions and fee estimation
- **Horizon server** — REST API for transaction submission and account data

**Trustline service** (`ITrustlineService`) is a Stellar-specific capability not present in other blockchains. It manages asset trustlines required before holding non-native assets.

**Account creation minimum:** New accounts require a minimum balance of 1 XLM (`accountCreationFee`). This is enforced in transfer logic.

**Testnet FriendBot:** The service integrates with Stellar's FriendBot for testnet account funding.

**Fee estimation:** Uses Soroban's fee estimation API rather than a fixed fee constant.

**Hardware wallets:** Ledger support via Stellar-specific derivation paths.
