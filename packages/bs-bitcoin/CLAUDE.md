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
│   ├── BSBitcoinBnsHelper              # BNS V2 API client (api.bnsv2.com)
│   ├── BSBitcoinMoralisHelper          # Moralis API client
│   ├── BSBitcoinOrdinalsHelper         # Ordinals/Inscriptions utilities
│   ├── BSBitcoinTatumHelper            # Tatum API client
│   └── BSBitcoinXverseHelper           # Xverse wallet integration
├── services/
│   ├── blockchain-data/        # TatumBDSBitcoin (UTXO-aware)
│   ├── exchange-data/          # DefiLlamaMoralisEDSBitcoin
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

**Name service:** BNS V2 API (`api.bnsv2.com`, called directly, not through the COZ API) for BNS (Bitcoin Name System) domain resolution, mainnet only. `resolveNameServiceDomain` checks the name is active via `/names/{domain}`, then returns the first valid BTC address from the owner's zonefile (`/zonefile/{domain}/raw`: `btc` field, then `addresses` entries of type `payment`). Zonefile is free-form owner data, so each candidate goes through `validateAddress`. Without a zonefile address it falls back to converting the owner Stacks address (c32-decoded hash160, version 22 only) into a P2WPKH address; that address is controlled by the Stacks key, which wallets usually derive on a different path than the BTC account.

**Data provider:** Tatum for UTXO data and transaction history, called through the COZ API proxy (`${COZ_API_URL}/v2/p/bitcoin/tatum/{mainnet|testnet}`, see `BSBitcoinConstants.API_URLS_BY_NETWORK_ID`); Mempool.space for the explorer.

**Stacks address support:** `c32check` handles c32-encoded Stacks addresses that share the Bitcoin key space.
