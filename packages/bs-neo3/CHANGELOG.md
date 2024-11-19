# Change Log - @cityofzion/bs-neo3

This log was last generated on Tue, 19 Nov 2024 20:13:09 GMT and should not be manually modified.

## 1.8.4
Tue, 19 Nov 2024 20:13:09 GMT

_Version update only_

## 1.8.3
Mon, 11 Nov 2024 22:23:41 GMT

_Version update only_

## 1.8.2
Thu, 07 Nov 2024 20:52:20 GMT

_Version update only_

## 1.8.1
Wed, 06 Nov 2024 17:50:37 GMT

### Patches

- Add generic BSName in GetLedgerTransport

## 1.8.0
Mon, 04 Nov 2024 22:49:56 GMT

### Minor changes

- Adjust interfaces to support account blockchain and Remove Flamingo swap implementation

## 1.7.1
Fri, 11 Oct 2024 20:36:36 GMT

### Patches

- Adjust NEO token return from Flamingo

## 1.7.0
Fri, 11 Oct 2024 19:26:03 GMT

### Minor changes

- Update Flamingo Finance API and add new tokens

## 1.6.1
Wed, 09 Oct 2024 18:36:56 GMT

### Patches

- Fix imageId of Ghostmarket IPFS image and add new tests for it

## 1.6.0
Tue, 01 Oct 2024 20:21:36 GMT

### Minor changes

- Implement testNetwork method

## 1.5.0
Tue, 01 Oct 2024 16:41:24 GMT

### Minor changes

- Implement clone self method

### Patches

- Fix issue where the array returned by transfer method is inconsistent

## 1.4.3
Fri, 20 Sep 2024 18:26:56 GMT

### Patches

- update route displayed

## 1.4.2
Fri, 20 Sep 2024 15:17:55 GMT

### Patches

- Including wrap logic

## 1.4.1
Mon, 09 Sep 2024 17:25:50 GMT

### Patches

- Update export

## 1.4.0
Mon, 09 Sep 2024 15:52:55 GMT

### Minor changes

- Add to support ledger multi account
- Add support to send in bulk

### Patches

- Make USDL unavailable for swap

## 1.3.3
Thu, 22 Aug 2024 18:40:33 GMT

### Patches

- Fixing NEO implementation

## 1.3.2
Wed, 21 Aug 2024 16:07:49 GMT

### Patches

- Update swap lib

## 1.3.1
Tue, 20 Aug 2024 20:50:53 GMT

### Patches

- Fixing swappable tokens list
- Fixing list swappable tokens

## 1.3.0
Tue, 20 Aug 2024 17:24:34 GMT

### Minor changes

- Implement swap multi invoke support

## 1.2.1
Wed, 14 Aug 2024 18:41:00 GMT

### Patches

- Fix issue where sending assets from NEON3 is being incorrectly flagged as arbitrary contract invocation

## 1.2.0
Fri, 02 Aug 2024 15:38:35 GMT

### Minor changes

- Implement new BlockchainDataService for NeoX using Blockscout

## 1.1.2
Tue, 30 Jul 2024 18:09:30 GMT

### Patches

- Fix GhostMarket IPFS NFT image

## 1.1.1
Mon, 29 Jul 2024 14:31:19 GMT

### Patches

- Fix normalization hash issues

## 1.1.0
Tue, 23 Jul 2024 21:44:02 GMT

### Minor changes

- Fix classes to new interfaces

## 1.0.4
Wed, 17 Jul 2024 16:13:43 GMT

### Patches

- Refactor related to multi network

## 1.0.3
Mon, 15 Jul 2024 22:59:16 GMT

### Patches

- Solve bug related to bs-electron by detecting two identical methods

## 1.0.2
Mon, 15 Jul 2024 19:04:57 GMT

### Patches

- Add support to multi network to AvailableNetworkIds type

## 1.0.1
Mon, 15 Jul 2024 18:05:28 GMT

### Patches

- Adapt constants to work with multi chain

## 1.0.0
Fri, 12 Jul 2024 00:06:10 GMT

### Breaking changes

- Adapt network to support multi network

## 0.14.3
Wed, 10 Jul 2024 20:54:48 GMT

### Patches

- Change NUDES to TIPS
- Move  @ledgerhq/hw-transport-node-hid to devDependencies

## 0.14.2
Fri, 28 Jun 2024 21:53:35 GMT

### Patches

- Removing react-native

## 0.14.1
Fri, 28 Jun 2024 20:18:04 GMT

### Patches

- Setting optional dependency of react native

## 0.14.0
Thu, 27 Jun 2024 21:15:08 GMT

### Minor changes

- Including flamingo swap feature

## 0.13.1
Thu, 20 Jun 2024 16:23:59 GMT

### Patches

- Emit "getSignatureEnd" when throws an error

## 0.13.0
Wed, 19 Jun 2024 15:40:02 GMT

### Minor changes

- Add emitterr in LedgerServiceEthereum

## 0.12.0
Wed, 19 Jun 2024 03:12:58 GMT

### Minor changes

- Export LedgerServiceNeo3

## 0.11.4
Tue, 11 Jun 2024 19:22:55 GMT

### Patches

- Extend new CryptoCompareEDS class to get support to token price history
- Added Has Token method

## 0.11.3
Thu, 06 Jun 2024 14:55:18 GMT

### Patches

-  Add new method to get rpc list

## 0.11.2
Thu, 30 May 2024 03:53:54 GMT

_Version update only_

## 0.11.1
Mon, 22 Apr 2024 18:15:20 GMT

### Patches

- Fix encrypt method return to always return a promise

## 0.11.0
Mon, 15 Apr 2024 20:14:54 GMT

### Minor changes

- Adaptation to work with the bs-electron package

## 0.10.0
Thu, 04 Apr 2024 19:52:20 GMT

### Minor changes

- Add ledger support

## 0.9.3
Wed, 28 Feb 2024 17:43:01 GMT

### Patches

- Add creator infomations in nft methods return

## 0.9.2
Tue, 30 Jan 2024 18:26:00 GMT

### Patches

- Fixed bug preventing decryption in dev mode in React Native
- Fixed lint errors that were preventing the build

## 0.9.1
Wed, 06 Dec 2023 21:51:30 GMT

### Patches

- Prevent the getAllTransaction method from breaking when Dora returns data from v1

## 0.9.0
Tue, 05 Dec 2023 18:42:10 GMT

### Minor changes

- Inserted within the TokenPricesResponse type the token hash

