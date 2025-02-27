# Contributing to Blockchain Services

We welcome contributions to the Blockchain Services project! Please follow the guidelines below to get started.

## Getting Started

### Setting Up the Development Environment
1. **Clone the Repository**
    ```sh
    git clone https://github.com/CityOfZion/blockchain-services
    ```
2. **Install Rush**
    ```sh
    cd blockchain-services
    npm i -g @microsoft/rush
   ```
2. **Install Dependencies**
    ```sh
    rush update
    ```
3. **Build dependencies**
    ```sh
    rush rebuild
    ```

## Testing
Packages that implement support for a blockchain have test cases under `packages/<package_name>/src/__tests__`.

To run tests:
```sh
rush rebuild
cd packages/<package_name
rushx test <optional_test_path>
```
You can omit the test file path to run all tests for that package.
