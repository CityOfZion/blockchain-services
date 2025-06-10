declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_PRIVATE_KEY: string
      TEST_BRIDGE_NEO3_ADDRESS: string
      TEST_BRIDGE_PRIVATE_KEY: string
    }
  }
}

export {}
