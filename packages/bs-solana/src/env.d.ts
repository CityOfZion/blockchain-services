declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_MNEMONIC: string
    }
  }
}

export {}
