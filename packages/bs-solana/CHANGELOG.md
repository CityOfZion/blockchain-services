# Change Log - @cityofzion/bs-solana

This log was last generated on Tue, 28 Apr 2026 18:29:40 GMT and should not be manually modified.

## 3.1.14
Tue, 28 Apr 2026 18:29:40 GMT

_Version update only_

## 3.1.13
Mon, 27 Apr 2026 20:18:15 GMT

### Updates

- Add CLAUDE.md

## 3.1.12
Tue, 21 Apr 2026 16:34:29 GMT

_Version update only_

## 3.1.11
Fri, 17 Apr 2026 00:42:16 GMT

### Updates

- Migrate from BSBigNumberHelper to BSBigNumber
- WalletConnectService rewritten with Zod validation to support new params validation

## 3.1.10
Wed, 15 Apr 2026 19:43:40 GMT

### Updates

- Update Axios dependency

## 3.1.9
Thu, 09 Apr 2026 18:51:16 GMT

### Updates

- Add relatedAddress property to Transaction type

## 3.1.8
Wed, 08 Apr 2026 19:25:42 GMT

### Updates

- Add blockchain and isPending properties to Transaction type

## 3.1.7
Wed, 08 Apr 2026 13:56:56 GMT

_Version update only_

## 3.1.6
Wed, 01 Apr 2026 15:09:44 GMT

_Version update only_

## 3.1.5
Tue, 31 Mar 2026 18:49:48 GMT

_Version update only_

## 3.1.4
Thu, 26 Mar 2026 19:08:54 GMT

### Updates

- Prefix internal methods with underscore and make TokenServiceSolana generic
- Remove legacy tokenType and type fields from transaction outputs
- Improve service name typings

## 3.1.3
Mon, 23 Mar 2026 16:17:33 GMT

_Version update only_

## 3.1.2
Mon, 23 Mar 2026 12:43:32 GMT

### Updates

- Fix contract hash URL

## 3.1.1
Fri, 20 Mar 2026 19:51:05 GMT

_Version update only_

## 3.1.0
Thu, 19 Mar 2026 16:35:03 GMT

### Updates

- Adapt transaction interfaces
- Fix tests and update ESLint version
- Apply new transfer, transaction and explorer interfaces and types
- Implement new NFT event type
- Remove tokenHash in NFT event
- Remove contractHash and rename contractHashUrl to tokenUrl from token event type

## 3.0.6
Mon, 02 Mar 2026 14:32:56 GMT

### Updates

- Adjust implementations to fit the updated blockchain service interfaces that now support Bitcoin

## 3.0.5
Sat, 21 Feb 2026 18:56:12 GMT

### Updates

- Replace @solana/web3.js to @solana/kit
- Replace jest to vitest

## 3.0.4
Fri, 13 Feb 2026 22:47:31 GMT

### Updates

- Fix transaction amount format

## 3.0.3
Wed, 11 Feb 2026 21:38:14 GMT

### Updates

- Fix Wallet Connect implementation

## 3.0.2
Tue, 10 Feb 2026 14:48:23 GMT

### Updates

- Implement WalletConnect support

## 3.0.1
Fri, 06 Feb 2026 15:34:13 GMT

### Updates

- New version policy to align with other blockchain packages.
- Fit into the new NFT interfaces and remove Metaplex Sdk from the API

## 1.2.0
Thu, 29 Jan 2026 15:41:42 GMT

### Minor changes

- Adapt to new interfaces
- Fix version

## 2.1.0
Tue, 27 Jan 2026 18:42:09 GMT

### Minor changes

- Change the implementations to fit new blockchain-service interfaces
- Unify transaction interface

## 2.0.11
Fri, 09 Jan 2026 18:51:04 GMT

_Version update only_

## 2.0.10
Fri, 02 Jan 2026 18:27:28 GMT

_Version update only_

## 2.0.9
Fri, 26 Dec 2025 16:54:17 GMT

### Patches

- Add rpcNetworkUrls
- Changed Solana RPC endpoints from Tatum gateway to COZ proxy for mainnet and devnet

## 2.0.8
Fri, 28 Nov 2025 14:03:41 GMT

_Version update only_

## 2.0.7
Mon, 17 Nov 2025 15:12:54 GMT

_Version update only_

## 2.0.6
Mon, 27 Oct 2025 14:12:54 GMT

### Patches

- Insert explorerUri to NFT response

## 2.0.5
Fri, 24 Oct 2025 22:41:54 GMT

_Version update only_

## 2.0.4
Fri, 10 Oct 2025 12:24:59 GMT

### Patches

- Implement pingNode function

## 2.0.3
Fri, 10 Oct 2025 01:36:19 GMT

### Patches

- General improvements
- Bump dependencies version

## 2.0.2
Wed, 01 Oct 2025 23:44:28 GMT

_Version update only_

## 2.0.1
Mon, 08 Sep 2025 19:38:54 GMT

_Version update only_

## 2.0.0
Tue, 02 Sep 2025 22:47:47 GMT

### Breaking changes

- Add Solana initial implementation

### Updates

- Update ts-node and Axios dependency

