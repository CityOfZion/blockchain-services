# Change Log - @cityofzion/bs-neo-legacy

This log was last generated on Thu, 11 Sep 2025 16:10:40 GMT and should not be manually modified.

## 1.13.3
Thu, 11 Sep 2025 16:10:40 GMT

### Patches

- Increase transaction fee when over max transaction size

## 1.13.2
Mon, 08 Sep 2025 19:38:54 GMT

### Patches

- Predicates should return a boolean

## 1.13.1
Tue, 02 Sep 2025 22:47:47 GMT

### Patches

- Add Solana initial implementation

## 1.13.0
Mon, 01 Sep 2025 18:24:15 GMT

### Minor changes

- Add type in transactions

## 1.12.8
Tue, 19 Aug 2025 17:17:33 GMT

### Patches

- Fix unclaimed GAS

## 1.12.7
Tue, 19 Aug 2025 15:03:33 GMT

_Version update only_

## 1.12.6
Wed, 13 Aug 2025 17:24:01 GMT

### Patches

- Improve send, claim and migration required fee

## 1.12.5
Tue, 12 Aug 2025 18:55:01 GMT

### Patches

- Update libs

## 1.12.4
Tue, 24 Jun 2025 16:33:10 GMT

_Version update only_

## 1.12.3
Tue, 10 Jun 2025 20:47:03 GMT

### Patches

- Refactor code to use new helpers

## 1.12.2
Sat, 31 May 2025 13:37:40 GMT

### Patches

- Improve formatNumber method

## 1.12.1
Thu, 29 May 2025 19:24:38 GMT

### Patches

- Update Dora TS (SDK)
- Remove default values for Mint and Burn

## 1.12.0
Thu, 22 May 2025 23:10:38 GMT

### Minor changes

- Create the exportFullTransactionsByAddress method

### Patches

- Add pageSize param for getFullTransactionsByAddress

## 1.11.1
Thu, 15 May 2025 12:48:12 GMT

### Patches

- Revert position between Mint and Burn

## 1.11.0
Tue, 06 May 2025 15:11:09 GMT

### Minor changes

- Create the getFullTransactionsByAddress method and add Axios library

## 1.10.10
Thu, 01 May 2025 16:41:46 GMT

### Patches

- Adjust transfers to handle scenarios that have a transaction size beyond 1024 bytes

## 1.10.9
Tue, 29 Apr 2025 20:48:08 GMT

### Patches

- Use normalizeHash in helper

## 1.10.8
Wed, 16 Apr 2025 20:44:43 GMT

### Patches

- Update license

## 1.10.7
Thu, 10 Apr 2025 21:27:21 GMT

### Patches

- Fix COZ address used in migration intent

## 1.10.6
Thu, 10 Apr 2025 20:33:39 GMT

### Patches

- Fix migrate enough balance conditional

## 1.10.5
Fri, 28 Mar 2025 21:07:26 GMT

### Patches

- Improve migration balance calculation

## 1.10.4
Wed, 26 Mar 2025 18:20:32 GMT

### Patches

- Export native tokens

## 1.10.3
Fri, 14 Mar 2025 20:31:57 GMT

_Version update only_

## 1.10.2
Wed, 12 Mar 2025 18:20:20 GMT

### Patches

- Fix migration amount validation

## 1.10.1
Tue, 11 Mar 2025 18:24:06 GMT

### Patches

- Change string[] to string return on migrateToNeo3 method

## 1.10.0
Fri, 07 Mar 2025 18:13:11 GMT

### Minor changes

- Create migrateToNeo3 and calculateToMigrateToNeo3Values methods

## 1.9.1
Tue, 25 Feb 2025 17:58:55 GMT

### Patches

- Change untilIndex to untilIndexByBlockchainService record

## 1.9.0
Mon, 24 Feb 2025 21:18:54 GMT

### Minor changes

- Add functionality to generate address until a specific index

## 1.8.2
Mon, 13 Jan 2025 20:30:41 GMT

_Version update only_

## 1.8.1
Thu, 09 Jan 2025 13:28:41 GMT

_Version update only_

## 1.8.0
Tue, 07 Jan 2025 14:34:40 GMT

### Minor changes

- Add getAddressTemplateUrl and getTxTemplateUrl methods

## 1.7.1
Mon, 06 Jan 2025 15:08:15 GMT

### Patches

- Use denormalizeHash in buildTransactionUrl method

## 1.7.0
Fri, 20 Dec 2024 23:00:27 GMT

### Minor changes

- Add Ledger support

## 1.6.7
Wed, 18 Dec 2024 11:11:37 GMT

_Version update only_

## 1.6.6
Mon, 16 Dec 2024 19:45:17 GMT

_Version update only_

## 1.6.5
Sat, 14 Dec 2024 02:14:48 GMT

_Version update only_

## 1.6.4
Fri, 13 Dec 2024 17:18:59 GMT

_Version update only_

## 1.6.3
Tue, 19 Nov 2024 20:13:09 GMT

_Version update only_

## 1.6.2
Mon, 11 Nov 2024 22:23:41 GMT

_Version update only_

## 1.6.1
Thu, 07 Nov 2024 20:52:20 GMT

_Version update only_

## 1.6.0
Mon, 04 Nov 2024 22:49:56 GMT

### Minor changes

- Adjust interfaces to support account blockchain

## 1.5.1
Fri, 11 Oct 2024 19:26:03 GMT

_Version update only_

## 1.5.0
Tue, 01 Oct 2024 20:21:36 GMT

### Minor changes

- Implement testNetwork method

## 1.4.0
Tue, 01 Oct 2024 16:41:24 GMT

### Minor changes

- Implement clone self method

### Patches

- Fix issue where the array returned by transfer method is inconsistent

## 1.3.0
Mon, 09 Sep 2024 15:52:55 GMT

### Minor changes

- Add to support ledger multi account
- Add support to send in bulk

## 1.2.3
Wed, 21 Aug 2024 16:07:49 GMT

_Version update only_

## 1.2.2
Tue, 20 Aug 2024 20:50:53 GMT

_Version update only_

## 1.2.1
Tue, 20 Aug 2024 17:24:34 GMT

_Version update only_

## 1.2.0
Fri, 02 Aug 2024 15:38:35 GMT

### Minor changes

- Implement new BlockchainDataService for NeoX using Blockscout

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
Mon, 15 Jul 2024 18:28:10 GMT

### Patches

- Fix incorrect exclude type

## 1.0.1
Mon, 15 Jul 2024 18:05:28 GMT

### Patches

- Adapt constants to work with multi chain

## 1.0.0
Fri, 12 Jul 2024 00:06:10 GMT

### Breaking changes

- Adapt network to support multi network

## 0.10.6
Fri, 28 Jun 2024 21:53:35 GMT

### Patches

- Removing react-native

## 0.10.5
Thu, 27 Jun 2024 21:15:08 GMT

_Version update only_

## 0.10.4
Wed, 19 Jun 2024 15:40:02 GMT

_Version update only_

## 0.10.3
Tue, 11 Jun 2024 19:22:55 GMT

### Patches

- Extend new CryptoCompareEDS class to get support to token price history

## 0.10.2
Thu, 06 Jun 2024 14:55:18 GMT

### Patches

-  Add new method to get rpc list

## 0.10.1
Thu, 30 May 2024 03:53:54 GMT

_Version update only_

## 0.10.0
Mon, 15 Apr 2024 20:14:54 GMT

### Minor changes

- Adaptation to work with the bs-electron package

## 0.9.3
Thu, 04 Apr 2024 19:52:20 GMT

_Version update only_

## 0.9.2
Wed, 28 Feb 2024 17:43:01 GMT

_Version update only_

## 0.9.1
Tue, 30 Jan 2024 18:26:00 GMT

### Patches

- Removed 0x from the return token od the getBalance method
- Fixed bug preventing decryption in dev mode in React Native
- Fixed lint errors that were preventing the build

## 0.9.0
Tue, 05 Dec 2023 18:42:10 GMT

### Minor changes

- Inserted within the TokenPricesResponse type the token hash

