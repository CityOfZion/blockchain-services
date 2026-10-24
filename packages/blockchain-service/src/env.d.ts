declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_NEO_MNEMONIC_PRIVATE_KEY: string
    }
  }
}

export {}
