declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TATUM_MAINNET_API_KEY: string
      TATUM_TESTNET_API_KEY: string
      MORALIS_API_KEY: string
    }
  }
}

export {}
