# Change Log - @cityofzion/bs-swap

This log was last generated on Wed, 26 Mar 2025 18:20:32 GMT and should not be manually modified.

## 0.5.10
Wed, 26 Mar 2025 18:20:32 GMT

_Version update only_

## 0.5.9
Fri, 14 Mar 2025 21:40:49 GMT

_Version update only_

## 0.5.8
Fri, 14 Mar 2025 20:31:57 GMT

_Version update only_

## 0.5.7
Thu, 13 Mar 2025 19:46:06 GMT

### Patches

- Use addressToReceive as receiverAddress in calculateFee

## 0.5.6
Tue, 11 Mar 2025 18:24:06 GMT

_Version update only_

## 0.5.5
Fri, 07 Mar 2025 18:13:11 GMT

_Version update only_

## 0.5.4
Tue, 25 Feb 2025 17:58:55 GMT

_Version update only_

## 0.5.3
Mon, 24 Feb 2025 21:18:54 GMT

_Version update only_

## 0.5.2
Tue, 28 Jan 2025 14:15:47 GMT

### Patches

- Fix debounce issue when calling setAmountToUse

## 0.5.1
Thu, 16 Jan 2025 18:48:13 GMT

### Patches

- Add round up to min and apply decimals correctly

## 0.5.0
Mon, 13 Jan 2025 20:30:41 GMT

### Minor changes

- Add extraId feature

## 0.4.1
Thu, 09 Jan 2025 13:28:41 GMT

### Patches

- Add the network property again

## 0.4.0
Tue, 07 Jan 2025 14:34:40 GMT

### Minor changes

- Add addressTemplateUrl and txTemplateUrl properties and methods to create them

## 0.3.3
Mon, 06 Jan 2025 15:08:15 GMT

_Version update only_

## 0.3.2
Thu, 19 Dec 2024 22:15:45 GMT

### Patches

- Update Swap Dora URL

## 0.3.1
Wed, 18 Dec 2024 22:05:35 GMT

### Patches

- Remove mandatory decimals and fetch it in setTokenToUse function if it doesn't exist

## 0.3.0
Wed, 18 Dec 2024 11:11:37 GMT

### Minor changes

- Add new error event for SimpleSwapService

### Patches

- Add 1% in SimpleSwap minimum
- Clear amountToReceive and amountToUseMinMax when setTokenToReceive is called

## 0.2.9
Mon, 16 Dec 2024 22:07:45 GMT

### Patches

- Throw error message returned by SimpleSwap instead of default Axios error

## 0.2.8
Mon, 16 Dec 2024 19:45:17 GMT

### Patches

- Fix incorrect amount formatting

## 0.2.7
Sat, 14 Dec 2024 03:19:25 GMT

### Patches

- Fix problem where the amountToUseMinMax is not being fixed

## 0.2.6
Sat, 14 Dec 2024 02:56:00 GMT

### Patches

- Fix error when trying to send a value with more decimal places than the token supports

## 0.2.5
Sat, 14 Dec 2024 02:14:48 GMT

### Patches

- Fix bug where availableTokensToUse has tokens that do not have decimals

## 0.2.4
Fri, 13 Dec 2024 17:18:58 GMT

### Patches

- Add log in swap response

## 0.2.3
Mon, 02 Dec 2024 19:13:39 GMT

### Patches

- Remove the API key param

## 0.2.2
Tue, 19 Nov 2024 20:13:09 GMT

_Version update only_

## 0.2.1
Tue, 12 Nov 2024 21:14:34 GMT

### Patches

- Export the SimpleSwapServiceHelper

## 0.2.0
Mon, 11 Nov 2024 22:23:41 GMT

### Minor changes

- Add refund in SwapStatus type and separate getStatus method

## 0.1.3
Thu, 07 Nov 2024 20:52:20 GMT

_Version update only_

## 0.1.2
Wed, 06 Nov 2024 17:50:37 GMT

_Version update only_

## 0.1.1
Tue, 05 Nov 2024 17:53:51 GMT

### Patches

- Fix find in available token

## 0.1.0
Mon, 04 Nov 2024 22:49:56 GMT

### Minor changes

- Add support to SimpleSwap

