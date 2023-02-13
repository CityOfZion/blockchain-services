
export const exception = {
    invalidBlockchainService: (message?: string) => {
        throw new Error(`Invalid blockchainServices => ${message}`);
    },
    blockchainAlreadyExist: (blockchainName: string) => {
        throw new Error(`The blockchain ${blockchainName} already exist`);
    }
}