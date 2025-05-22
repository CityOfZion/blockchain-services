# Blockchain Service

## Description
Collection of packages responsible for normalizing blockchain operations, allowing to use different blockchain technologies by abstracting the
complexity of each one with a single interface.

## Available packages
| Package                        | Description                                                                                                                                                    |
|--------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| @cityofzion/blockchain-service | Contains the main interfaces and methods used by different blockchain implementations, as well as utility classes like an aggregator and exchange data service |
| @cityofzion/bs-asteroid-sdk    | Contains an auxiliary method to generate a mnemonic using @moonlight-io/asteroid-sdk-js                                                                        |
| @cityofzion/bs-electron        | Responsible for leveraging the communication between main and renderer process, exposing the API to be used in Electron                                        |
| @cityofzion/bs-ethereum        | Implementation of interfaces and methods for the Ethereum blockchain                                                                                           |
| @cityofzion/bs-neo3            | Implementation of interfaces and methods for the NEO 3 blockchain                                                                                              |
| @cityofzion/bs-neo-legacy      | Implementation of interfaces and methods for the NEO Legacy (NEO 2) blockchain                                                                                 |
| @cityofzion/bs-swap            | Implementation of interfaces and methods for the Swaps                                                                                                         |
| @cityofzion/bs-neox            | Implementation of interfaces and methods for the Neo X blockchain                                                                                              |


## Technologies Used
- **TypeScript**
- **React Native**
- **Java** (for Android native code)
- **Swift** (for iOS native code)
