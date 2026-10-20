declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_COZ_API_KEY: string
      TEST_MNEMONIC: string
    }
  }
}

export {}
