# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Bitcoin blockchain service. The most complex implementation in the monorepo due to UTXO model, multiple address types, Ordinals/Inscriptions support, and BIP38 encryption.

## Commands

```bash
rushx build
rushx test
rushx test src/__tests__/BSBitcoin.spec.ts  # single file
rushx lint
rushx typecheck
```

## Structure

```
src/
├── __tests__/              # 7 test files
├── constants/              # BSBitcoinConstants
├── helpers/
│   ├── BSBitcoinBIP32SingletonHelper   # BIP32 HD wallet singleton
│   ├── BSBitcoinECPairSingletonHelper  # EC keypair singleton
│   ├── BSBitcoinHiroHelper             # Hiro API client
│   ├── BSBitcoinOrdinalsHelper         # Ordinals/Inscriptions utilities
│   ├── BSBitcoinTatumHelper            # Tatum API client
│   └── BSBitcoinXverseHelper           # Xverse wallet integration
├── services/
│   ├── blockchain-data/        # TatumBDSBitcoin (UTXO-aware)
│   ├── exchange-data/          # CryptoCompareEDS
│   ├── explorer/               # MempoolExplorerService
│   ├── ledger/                 # LedgerServiceBitcoin
│   ├── nft-data/               # XverseNftDataService (Ordinals)
│   ├── token/                  # TokenServiceBitcoin
│   └── wallet-connect/         # WalletConnectServiceBitcoin
├── types.ts                # UTXO types, Tatum API shapes, Ordinal types
├── BSBitcoin.ts            # Main class (largest in monorepo ~21KB)
└── index.ts
```

## Architecture

**UTXO model:** Bitcoin uses UTXOs, not account balances. `TTransactionUTXO<N>` is used instead of `TTransactionDefault<N>`. The blockchain data service returns UTXOs and `BSBitcoin` selects and combines them for each transfer.

**Address types:** P2PKH (legacy `1...`), P2WPKH (native segwit `bc1...`), and P2SH (wrapped segwit `3...`). Address validation and signing differ per type. `BSBitcoin` detects the type and handles each path appropriately.

**Key libraries:**
- `bitcoinjs-lib` v7 — transaction building and signing
- `bip32` + `bip39` — HD wallet derivation
- `bip38` — BIP38 encrypted key format
- `ecpair` + `@bitcoinerlab/secp256k1` — EC keypairs

**Singleton helpers:** `BSBitcoinBIP32SingletonHelper` and `BSBitcoinECPairSingletonHelper` manage shared crypto instances to avoid redundant initialization.

**Ordinals/NFTs:** Handled via Xverse wallet integration (`XverseNftDataService`). Ordinals are Bitcoin inscriptions treated as NFTs.

**Name service:** Hiro API integration for BNS (Bitcoin Name System) domain resolution.

**Data provider:** Tatum for UTXO data and transaction history; Mempool.space for the explorer.

**Stacks address support:** `c32check` handles c32-encoded Stacks addresses that share the Bitcoin key space.
