declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_PRIVATE_KEY: string
      TEST_BRIDGE_NEOX_ADDRESS: string
      TEST_BRIDGE_PRIVATE_KEY: string
    }
  }
}

export {}
