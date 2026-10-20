declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_COZ_API_KEY: string
      TEST_PRIVATE_KEY: string
      TEST_BRIDGE_PRIVATE_KEY: string
      TEST_BRIDGE_NEO3_ADDRESS: string
    }
  }
}

export {}
