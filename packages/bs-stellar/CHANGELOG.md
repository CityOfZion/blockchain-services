# Change Log - @cityofzion/bs-stellar

This log was last generated on Wed, 08 Apr 2026 19:25:42 GMT and should not be manually modified.

## 3.1.8
Wed, 08 Apr 2026 19:25:42 GMT

### Updates

- Add blockchain and isPending properties to Transaction type

## 3.1.7
Wed, 08 Apr 2026 13:56:56 GMT

### Updates

- Fix changeTrust method when limit is undefined
- Fix getTransactionsByAddress method to return transactions from newest to oldest

## 3.1.6
Wed, 01 Apr 2026 15:09:44 GMT

### Updates

- Replace Horizon and Soroban server to Dora Middleware

## 3.1.5
Tue, 31 Mar 2026 18:49:48 GMT

_Version update only_

## 3.1.4
Thu, 26 Mar 2026 19:08:54 GMT

### Updates

- Extract TrustlineServiceStellar from BSStellar with trustline management methods
- Add faucet support and prefix internal methods with underscore
- Enhance HorizonBDSStellar with generic event handling
- Improve service name typings

## 3.1.3
Mon, 23 Mar 2026 16:17:33 GMT

_Version update only_

## 3.1.2
Mon, 23 Mar 2026 12:43:32 GMT

_Version update only_

## 3.1.1
Fri, 20 Mar 2026 19:51:05 GMT

_Version update only_

## 3.1.0
Thu, 19 Mar 2026 16:35:03 GMT

### Updates

- Adapt transaction interfaces
- Update ESLint version
- Apply new transfer, transaction and explorer interfaces and types
- Remove contractHash and rename contractHashUrl to tokenUrl from token event type

## 3.0.6
Mon, 02 Mar 2026 14:32:56 GMT

### Updates

- Adjust implementations to fit the updated blockchain service interfaces that now support Bitcoin
- Improve WalletConnect implementation

## 3.0.5
Sat, 21 Feb 2026 18:56:12 GMT

### Updates

- Update classes to align with the new generateAccount's function interface
- Replace jest to vitest

## 3.0.4
Fri, 13 Feb 2026 22:47:31 GMT

### Updates

- Fix transaction amount format

## 3.0.3
Wed, 11 Feb 2026 21:38:14 GMT

### Updates

- Include bip44Path in generateAccountFrommnemonic method

## 3.0.2
Tue, 10 Feb 2026 14:48:23 GMT

_Version update only_

## 3.0.1
Fri, 06 Feb 2026 15:34:13 GMT

### Updates

- New version policy to align with other blockchain packages.

## 1.1.0
Thu, 29 Jan 2026 15:41:42 GMT

### Minor changes

- Adapt to new interfaces

## 1.0.0
Tue, 27 Jan 2026 18:42:09 GMT

### Breaking changes

- Add Stellar initial implementation

