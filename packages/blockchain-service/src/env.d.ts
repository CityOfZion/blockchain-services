declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_COZ_API_KEY: string
    }
  }
}

export {}
