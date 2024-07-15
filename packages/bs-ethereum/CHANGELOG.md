# Change Log - @cityofzion/bs-ethereum

This log was last generated on Mon, 15 Jul 2024 18:05:28 GMT and should not be manually modified.

## 2.0.1
Mon, 15 Jul 2024 18:05:28 GMT

### Patches

- Adapt constants to work with multi chain

## 2.0.0
Fri, 12 Jul 2024 00:06:10 GMT

### Breaking changes

- Add support to EVM

## 1.4.3
Thu, 27 Jun 2024 21:15:08 GMT

_Version update only_

## 1.4.2
Thu, 20 Jun 2024 20:15:18 GMT

### Patches

- Pass this.emitter when creating LedgerSigner within the connect method

## 1.4.1
Thu, 20 Jun 2024 16:23:59 GMT

### Patches

- Emit "getSignatureEnd" when throws an error and fix errors when try to invoke some methods

## 1.4.0
Wed, 19 Jun 2024 15:40:02 GMT

### Minor changes

- Add emitter in LedgerServiceNeo3

## 1.3.0
Wed, 19 Jun 2024 03:12:58 GMT

### Minor changes

- Create a new ethers Signer for Ledger

## 1.2.4
Tue, 11 Jun 2024 19:22:55 GMT

### Patches

- Added Has Token method
- Extend new CryptoCompareEDS class to get support to token price history

## 1.2.3
Thu, 06 Jun 2024 14:55:18 GMT

### Patches

-  Add new method to get rpc list

## 1.2.2
Fri, 26 Apr 2024 22:48:55 GMT

### Patches

- fix error to sign transaction when trying to transfer without ledger

## 1.2.1
Mon, 22 Apr 2024 21:49:50 GMT

### Patches

- Change Bitquery implementation to get information from mirror

## 1.2.0
Mon, 15 Apr 2024 20:14:54 GMT

### Minor changes

- Adaptation to work with the bs-electron package

## 1.1.0
Thu, 04 Apr 2024 19:52:20 GMT

### Minor changes

- Add ledger support

### Patches

- Change Goerli to Sepolia and call RPC using testnet instead of Bitquery

## 1.0.4
Mon, 04 Mar 2024 21:53:09 GMT

### Patches

- fix wrong calculated fee

## 1.0.3
Wed, 28 Feb 2024 17:43:01 GMT

### Patches

- Add creator infomations in nft methods return

## 1.0.2
Tue, 27 Feb 2024 20:29:09 GMT

### Patches

- Remove the mining wait in the transfer method to avoid long promises that take time to resolve.

## 1.0.1
Thu, 22 Feb 2024 16:49:56 GMT

### Patches

- Fix getTokenPrices that is returning a wrong price for ETH token address

## 1.0.0
Fri, 16 Feb 2024 16:13:22 GMT

### Breaking changes

- Change bitquery providers to receive apiKey on class initialization

## 0.9.1
Tue, 30 Jan 2024 18:26:00 GMT

### Patches

- Fixed bug with repeated ETH token in getBalance method

## 0.9.0
Tue, 05 Dec 2023 18:42:10 GMT

### Minor changes

- Inserted within the TokenPricesResponse type the token hash

### Patches

- Fixed issue with the getBalance method that returned negative numbers and the wrong ETH value

