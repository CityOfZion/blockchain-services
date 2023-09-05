export class BlockchainAlreadyExistError extends Error {
  constructor(blockchainName: string) {
    super(`The blockchain ${blockchainName} already exist`)
  }
}

export class InvalidBlockchainServiceError extends Error {
  constructor(message?: string) {
    super(`Invalid blockchainServices => ${message}`)
  }
}

export class BlockchainNotFoundError extends Error {
  constructor(blockchainName: string) {
    super(`The blockchain ${blockchainName} not found`)
  }
}
