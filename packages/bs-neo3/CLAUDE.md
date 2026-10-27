# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

NEO N3 blockchain service. Includes voting, GAS claiming, and Neo3→NeoX bridge support.

## Commands

```bash
rushx build
rushx test
rushx test src/__tests__/BSNeo3.spec.ts  # single file
rushx lint
rushx typecheck
```

## Structure

```
src/
├── __tests__/              # 11 test files
├── constants/              # BSNeo3Constants (networks, tokens, contract hashes)
├── helpers/
│   ├── BSNeo3Helper                       # Address/key utilities
│   ├── BSNeo3NeonJsSingletonHelper        # Singleton neon-js instance
│   └── BSNeo3NeonDappKitSingletonHelper   # Singleton NeonDappKit instance
├── services/
│   ├── blockchain-data/        # Dora + RPC BDS
│   ├── exchange-data/          # DefiLlamaCryptoCompareFlamingoForthewinEDSNeo3
│   ├── explorer/               # DoraExplorerService
│   ├── full-transactions-data/ # DoraFullTransactionsData
│   ├── ledger/                 # NeonDappKitLedgerService
│   ├── nft-data/               # GhostMarketNDS
│   ├── claim/                  # ClaimServiceNeo3 (GAS distribution)
│   ├── vote/                   # VoteServiceNeo3 (candidates, committee, council)
│   ├── neo3-neox-bridge/       # Neo3NeoXBridgeService
│   ├── token/                  # TokenServiceNeo3
│   └── wallet-connect/         # WalletConnectServiceNeo3
├── types.ts                # Voting types, bridge types, Dora API shapes
├── BSNeo3.ts               # Main class
└── index.ts
```

## Architecture

`BSNeo3` exposes two NEO-specific services not found in other blockchains:

- **`voteService`** (`IVoteService<N>`) — fetches candidates, committee members, council members, and submits votes on-chain.
- **`claimService`** (`IClaimService<N>`) — claims uncollected GAS rewards.
- **`neo3NeoXBridgeService`** — orchestrates the bridge from NEO N3 to NEO X.

**Key libraries:**
- `@cityofzion/neon-js` v5 — core NEO N3 operations
- `@cityofzion/neon-dappkit` v0.6 — dApp toolkit (used for Ledger)
- `@cityofzion/dora-ts` — Dora blockchain data API client

**Singleton helpers:** `BSNeo3NeonJsSingletonHelper` and `BSNeo3NeonDappKitSingletonHelper` manage shared instances to avoid duplicate initialization across services within the same `BSNeo3` object.

**Multi-transfer:** NEO N3 supports sending multiple token intents in a single transaction (`isMultiTransferSupported = true`).

**Custom networks:** Supported — consumers can pass custom network URLs.
