# Change Log - @cityofzion/blockchain-service

This log was last generated on Tue, 12 Aug 2025 18:55:01 GMT and should not be manually modified.

## 1.19.2
Tue, 12 Aug 2025 18:55:01 GMT

### Patches

- Add BridgeOrchestrator interface and update Neo3NeoXBrigeService interface

## 1.19.1
Tue, 24 Jun 2025 16:33:10 GMT

### Patches

- Apply a lowercase to hash within the normalizeHash function.

## 1.19.0
Tue, 10 Jun 2025 20:47:03 GMT

### Minor changes

- Add Neo3NeoXBridge feature and helpers

## 1.18.2
Sat, 31 May 2025 13:37:40 GMT

### Patches

- Improve formatNumber method

## 1.18.1
Thu, 29 May 2025 19:24:38 GMT

### Patches

- Update Dora TS (SDK)

## 1.18.0
Thu, 22 May 2025 23:10:38 GMT

### Minor changes

- Create the exportFullTransactionsByAddress method

### Patches

- Add pageSize param for getFullTransactionsByAddress

## 1.17.1
Tue, 06 May 2025 15:11:09 GMT

### Patches

- Create constants file and remove unused types

## 1.17.0
Tue, 29 Apr 2025 20:48:08 GMT

### Minor changes

- Create FlamingoForthewinEDS to get token prices and add FlamingoTokenInfoPricesResponse type

## 1.16.3
Wed, 16 Apr 2025 20:44:43 GMT

### Patches

- Update license

## 1.16.2
Fri, 28 Mar 2025 21:07:26 GMT

### Patches

- Remove BSMigrateNeo3 interface

## 1.16.1
Wed, 26 Mar 2025 18:20:32 GMT

### Patches

- Export native tokens

## 1.16.0
Fri, 14 Mar 2025 20:31:57 GMT

### Minor changes

- Add waitMigration function

## 1.15.3
Tue, 11 Mar 2025 18:24:06 GMT

### Patches

- Change string[] to string return on BSMigrationNeo3 interface

## 1.15.2
Fri, 07 Mar 2025 18:13:11 GMT

### Patches

- Create hasMigrationNeo3 method and its types

## 1.15.1
Tue, 25 Feb 2025 17:58:55 GMT

### Patches

- Change untilIndex to untilIndexByBlockchainService record

## 1.15.0
Mon, 24 Feb 2025 21:18:54 GMT

### Minor changes

- Add functionality to generate address until a specific index

## 1.14.0
Mon, 13 Jan 2025 20:30:41 GMT

### Minor changes

- Add types for extraIdToReceive and setExtraIdToReceive

## 1.13.3
Thu, 09 Jan 2025 13:28:41 GMT

### Patches

- Add the network property again

## 1.13.2
Tue, 07 Jan 2025 14:34:40 GMT

### Patches

- Add getAddressTemplateUrl and getTxTemplateUrl type methods, addressTemplateUrl and txTemplateUrl properties in SwapServiceToken

## 1.13.1
Mon, 06 Jan 2025 15:08:15 GMT

### Patches

- Deprecate waitForTransaction method
- Implement denormalizeHash method

## 1.13.0
Wed, 18 Dec 2024 11:11:37 GMT

### Minor changes

- Add new error event for SwapService interface

## 1.12.0
Mon, 16 Dec 2024 19:45:17 GMT

### Minor changes

- Add new function to format number

## 1.11.0
Sat, 14 Dec 2024 02:14:48 GMT

### Minor changes

- Add normalizeHash function

## 1.10.2
Fri, 13 Dec 2024 17:18:58 GMT

### Patches

- Add log in swap response

## 1.10.1
Tue, 19 Nov 2024 20:13:09 GMT

### Patches

- Add maxAttemps customizable on waitForAccountTransaction

## 1.10.0
Mon, 11 Nov 2024 22:23:41 GMT

### Minor changes

- Add refund in SwapStatus type and separate getStatus method

## 1.9.0
Thu, 07 Nov 2024 20:52:20 GMT

### Minor changes

- Add a new function to wait for a specific transaction by an account

## 1.8.0
Mon, 04 Nov 2024 22:49:56 GMT

### Minor changes

- Adjust swap interfaces

## 1.7.0
Fri, 11 Oct 2024 19:26:03 GMT

### Minor changes

- Update Flamingo Finance API

## 1.6.0
Tue, 01 Oct 2024 20:21:36 GMT

### Minor changes

- Implement testNetwork method

## 1.5.0
Tue, 01 Oct 2024 16:41:24 GMT

### Minor changes

- Implement clone self method

## 1.4.0
Mon, 09 Sep 2024 15:52:55 GMT

### Minor changes

- Add to support ledger multi account
- Add support to send in bulk

## 1.3.2
Wed, 21 Aug 2024 16:07:49 GMT

### Patches

- Update swap lib

## 1.3.1
Tue, 20 Aug 2024 20:50:53 GMT

### Patches

- Fixing list swappable tokens

## 1.3.0
Tue, 20 Aug 2024 17:24:34 GMT

### Minor changes

- Implement swap multi invoke support

## 1.2.0
Fri, 02 Aug 2024 15:38:35 GMT

### Minor changes

- Implement new BlockchainDataService for NeoX using Blockscout

## 1.1.0
Tue, 23 Jul 2024 21:44:02 GMT

### Minor changes

- Adapt interfaces to work with Moralis

## 1.0.2
Wed, 17 Jul 2024 16:13:43 GMT

### Patches

- Refactor related to multi network

## 1.0.1
Mon, 15 Jul 2024 18:05:28 GMT

### Patches

- Remove PartialNetwork type

## 1.0.0
Fri, 12 Jul 2024 00:06:10 GMT

### Breaking changes

- Adapt network to support multi network

## 0.13.0
Thu, 27 Jun 2024 21:15:08 GMT

### Minor changes

- Including flamingo swap feature

## 0.12.0
Wed, 19 Jun 2024 15:40:02 GMT

### Minor changes

- Add emitter in LedgerService

## 0.11.2
Tue, 11 Jun 2024 19:22:55 GMT

### Patches

- New class that uses CryptoCompare as ExchangeDataProvider
- Added Has Token method interface 

## 0.11.1
Thu, 06 Jun 2024 14:55:18 GMT

### Patches

-  Add new method to get rpc list

## 0.11.0
Mon, 15 Apr 2024 20:14:54 GMT

### Minor changes

- Adaptation to work with the bs-electron package

## 0.10.0
Thu, 04 Apr 2024 19:52:20 GMT

### Minor changes

- Ledger support

### Patches

- Fix ledger interfaces
- Update ledger interfaces

## 0.9.1
Wed, 28 Feb 2024 17:43:01 GMT

### Patches

- Add creator infomations in nft methods return

## 0.9.0
Tue, 05 Dec 2023 18:42:10 GMT

### Minor changes

- Inserted within the TokenPricesResponse type the token hash

