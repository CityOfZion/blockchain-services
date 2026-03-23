# Blockchain Service

## Description
Collection of packages responsible for normalizing blockchain operations, allowing to use different blockchain technologies by abstracting the
complexity of each one with a single interface.

## Install root dependencies
Install the [pnpm](https://pnpm.io). After install the dependencies in the root:
```bash
pnpm install
```

## Install/update package dependencies
Install/update the dependencies in each package:
```bash
rush update
```

## Delete package dependencies
Delete the dependencies in each package:
```bash
rush purge
```

## Add dependency 
Add a dependency in the package:
```bash
# cd packages/PACKAGE_NAME

rush add -p DEPENDENCY_NAME
```

## Build or rebuild
Build or rebuild each package:
```bash
rush build # has cache (not recommended)

rush rebuild # hasn't cache (recommended)
```

## Test
Test the package:
```bash
# cd packages/PACKAGE_NAME

rushx test
```

## Format
Format the package:
```bash
# cd packages/PACKAGE_NAME

rush format
```

## Lint
Lint the package:
```bash
# cd packages/PACKAGE_NAME

rush lint
```

## Create changelog
Create a changelog in each package:
```bash
rush change
```

## Package
Package each package in a `.tgz` file:
```bash
rush package
```

## Patch-package
Create a *patch-package* in the package:
```bash
# cd packages/PACKAGE_NAME

# Before change the dependency
rush-pnpm patch DEPENDENCY_NAME@DEPENDENCY_VERSION

# After change the dependency
rush-pnpm --subspace default patch-commit /ABSOLUTE_PATH/blockchain-services/common/temp/node_modules/.pnpm_patches/DEPENDENCY_NAME@DEPENDENCY_VERSION
```

## Available packages
| Package                        | Description                                                                                                                                                    |
|--------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| @cityofzion/blockchain-service | Contains the main interfaces and methods used by different blockchain implementations, as well as utility classes like an aggregator and exchange data service |
| @cityofzion/bs-electron        | Responsible for leveraging the communication between main and renderer process, exposing the API to be used in Electron                                        |
| @cityofzion/bs-ethereum        | Implementation of interfaces and methods for the Ethereum blockchain                                                                                           |
| @cityofzion/bs-neo3            | Implementation of interfaces and methods for the NEO 3 blockchain                                                                                              |
| @cityofzion/bs-neo-legacy      | Implementation of interfaces and methods for the NEO Legacy (NEO 2) blockchain                                                                                 |
| @cityofzion/bs-multichain      | Implementation of interfaces and methods for multichain features                                                                                               |
| @cityofzion/bs-neox            | Implementation of interfaces and methods for the Neo X blockchain                                                                                              |
| @cityofzion/bs-solana          | Implementation of interfaces and methods for the Solana blockchain                                                                                             |
| @cityofzion/bs-stellar         | Implementation of interfaces and methods for the Stellar blockchain                                                                                            |
| @cityofzion/bs-bitcoin         | Implementation of interfaces and methods for the Bitcoin blockchain                                                                                            |

## Technologies Used
- **pnpm**
- **Rush.js**
- **TypeScript**
- **ESLint**
- **Prettier**
- **Vitest**
