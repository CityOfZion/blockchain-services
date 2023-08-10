export class BlockchainAlreadyExist extends Error {
    constructor(blockchainName: string) {
        super(`The blockchain ${blockchainName} already exist`);
    }
}

export class InvalidBlockchainService extends Error {
    constructor(message?: string) {
        super(`Invalid blockchainServices => ${message}`);
    }
}
