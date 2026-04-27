# Change Log - @cityofzion/bs-bitcoin

This log was last generated on Mon, 27 Apr 2026 20:18:15 GMT and should not be manually modified.

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
- Fix input amount in transfer

## 3.1.7
Wed, 08 Apr 2026 13:56:56 GMT

_Version update only_

## 3.1.6
Wed, 01 Apr 2026 15:09:44 GMT

### Updates

- Remove BTC negative balance

## 3.1.5
Tue, 31 Mar 2026 18:49:48 GMT

### Updates

- Remove toSorted and use sort

## 3.1.4
Thu, 26 Mar 2026 19:08:54 GMT

### Updates

- Prefix internal methods with underscore and update IBSBitcoin interface accordingly
- Change native token hash and make TokenServiceBitcoin generic
- Improve service name typings

## 3.1.3
Mon, 23 Mar 2026 16:17:33 GMT

### Updates

- Add totalAmount in transactions

## 3.1.2
Mon, 23 Mar 2026 12:43:32 GMT

### Updates

- Add more delay time in Xverse API

## 3.1.1
Fri, 20 Mar 2026 19:51:05 GMT

_Version update only_

## 3.1.0
Thu, 19 Mar 2026 16:35:03 GMT

### Updates

- Use UTXO transaction interfaces
- Add WalletConnect for Bitcoin
- Apply new transfer, transaction and explorer interfaces and types
- Change deprecated V3 Tatum endpoints to V4 Tatum endpoints
- Remove tokenHash in NFT event
- Remove contractHash and rename contractHashUrl to tokenUrl from token event type
- Fix bitcoinjs-message version to 2.2.0
- Add COZ API endpoints instead of calling the providers directly
- Set the network as defaultNetwork

## 3.0.6
Mon, 02 Mar 2026 14:32:56 GMT

### Updates

- Bitcoin main implementation

