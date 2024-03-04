# Change Log - @cityofzion/bs-ethereum

This log was last generated on Mon, 04 Mar 2024 21:53:09 GMT and should not be manually modified.

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

