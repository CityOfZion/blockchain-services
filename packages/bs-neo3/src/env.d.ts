declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_COZ_API_KEY: string
      TEST_PRIVATE_KEY: string
      TEST_BRIDGE_PRIVATE_KEY: string
      TEST_BRIDGE_NEOX_ADDRESS: string
    }
  }
}

export {}
