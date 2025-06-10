declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_PRIVATE_KEY: string
      NEO_LEGACY_WITH_BALANCE_PRIVATE_KEY: string
    }
  }
}

export {}
