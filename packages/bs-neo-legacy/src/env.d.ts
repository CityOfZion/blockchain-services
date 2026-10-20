declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_COZ_API_KEY: string
      TEST_PRIVATE_KEY: string
    }
  }
}

export {}
