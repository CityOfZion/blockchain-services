declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_MAINNET_PRIVATE_KEY: string
      TEST_TESTNET_PRIVATE_KEY: string
      TEST_HEX_PRIVATE_KEY: string
      TEST_MNEMONIC: string
    }
  }
}

export {}
