# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Neo X blockchain service — an EVM-compatible NEO sidechain. Extends `BSEthereum` and adds NEO-specific bridge and consensus layer capabilities.

## Commands

```bash
rushx build
rushx test
rushx test src/__tests__/BSNeoX.spec.ts  # single file
rushx lint
rushx typecheck
```

## Structure

```
src/
├── __tests__/              # 8 test files
├── assets/
│   └── abis/               # bridge.ts, consensus.ts, key-management.ts
├── constants/              # BSNeoXConstants (networks, tokens)
├── helpers/                # BSNeoXHelper
├── services/
│   ├── blockchain-data/        # BlockscoutBDS
│   ├── exchange-data/          # FlamingoForthewinEDS
│   ├── explorer/               # BlockscoutExplorerService
│   ├── full-transactions-data/ # BlockscoutFullTransactionsData
│   ├── nft-data/               # GhostMarketNDS
│   ├── neo3-neox-bridge/       # Shared bridge service with bs-neo3
│   └── wallet-connect/         # WalletConnectServiceNeoX
├── types.ts
├── BSNeoX.ts               # Main class (extends BSEthereum)
└── index.ts
```

## Architecture

`BSNeoX extends BSEthereum<TBSNeoXName, TBSNeoXNetworkId>` — inheritance is intentional here. Neo X is EVM-compatible, so all Ethereum wallet/signing logic is reused.

**What BSNeoX adds over BSEthereum:**
- `neo3NeoXBridgeService` — the reverse direction of the bridge (vs. `bs-neo3` which handles the Neo3→NeoX direction)
- Overrides `_sendTransaction` with custom gas handling for the Neo X consensus layer
- Consensus and key-management ABIs for on-chain governance interactions
- TPKE (Threshold Public Key Encryption) via `neox-tpke` for consensus

**Two libraries for transaction handling:**
- `ethers` v5 — wallet operations, contract interactions, signing
- `viem` — low-level transaction serialization where ethers falls short

**Data provider:** Blockscout (not Moralis — NeoX uses Blockscout for all chain data).

**Exchange data:** FlamingoForthewin (not Moralis) — data comes from Flamingo DEX.

**Dependencies on other workspace packages:** `blockchain-service`, `bs-ethereum`, `bs-neo3`.
