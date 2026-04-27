# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

EVM-compatible blockchain service supporting Ethereum, Polygon, Base, Arbitrum, Celo, Avalanche, zkEVM, and Linea. Also serves as the base class for `bs-neox`.

## Commands

```bash
rushx build
rushx test
rushx test src/__tests__/BSEthereum.spec.ts  # single file
rushx lint
rushx typecheck
```

## Supported Networks

Defined in `src/constants/BSEthereumConstants.ts`:

| Chain | ID |
|---|---|
| Ethereum | 1 |
| Polygon | 137 |
| Base | 8453 |
| Arbitrum | 42161 |
| Celo | 42220 |
| Avalanche | 43114 |
| zkEVM | 1101 |
| Linea | 59144 |
| Sepolia (testnet) | 11155111 |

## Structure

```
src/
├── __tests__/
├── assets/             # ERC20 ABI (exported for consumers)
├── constants/          # BSEthereumConstants (networks, tokens, chain IDs)
├── helpers/            # BSEthereumHelper (chain ID resolution)
├── services/
│   ├── blockchain-data/        # Moralis RPC BDS
│   ├── exchange-data/          # MoralisEDS (token prices)
│   ├── explorer/               # BlockscoutExplorerService
│   ├── full-transactions-data/ # MoralisFullTransactionsData
│   ├── ledger/                 # EthersLedgerService
│   ├── nft-data/               # MoralisNftDataService
│   ├── token/                  # TokenServiceEthereum
│   └── wallet-connect/         # WalletConnectServiceEthereum
├── types.ts            # Moralis API response shapes, Ethereum-specific types
├── BSEthereum.ts       # Main class
└── index.ts
```

## Architecture

`BSEthereum<N, A>` implements `IBSEthereum<N, A>`, which extends `IBlockchainService` plus all capability mixins: `IBSWithEncryption`, `IBSWithFee`, `IBSWithLedger`, `IBSWithNft`, `IBSWithExplorer`, `IBSWithWalletConnect`, `IBSWithFullTransactions`.

**Key library:** `ethers` v5 for wallet operations, signing, and contract interactions.

**Data provider:** Moralis is the primary source for blockchain data, exchange rates, NFTs, and full transaction history. Blockscout is used for the explorer service.

**Hardware wallets:** `@ledgerhq/hw-app-eth` via `EthersLedgerService`.

**Signing:** Supports both standard ECDSA and EIP-712 typed data (`TypedDataSigner`).

`BSNeoX` extends this class directly — changes here affect NeoX behavior.
