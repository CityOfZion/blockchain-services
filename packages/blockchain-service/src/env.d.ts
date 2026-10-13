declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_COZ_API_KEY: string
      TEST_NEO3_PRIVATE_KEY: string
    }
  }
}

export {}
