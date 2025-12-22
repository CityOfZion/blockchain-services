declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MORALIS_API_KEY: string
    }
  }
}

export {}
