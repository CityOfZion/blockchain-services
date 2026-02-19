declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TATUM_MAINNET_API_KEY: string
      TATUM_TESTNET_API_KEY: string
      XVERSE_API_KEY: string
      HIRO_API_KEY: string
      TEST_MAINNET_PRIVATE_KEY: string
      TEST_TESTNET_PRIVATE_KEY: string
      TEST_HEX_PRIVATE_KEY: string
    }
  }
}

export {}
