import { BlockchainDataService, BlockchainService, CalculateTransferFeeDetails, SendTransactionParam, Claimable, Account, Exchange, BDSClaimable } from '@cityofzion/blockchain-service';
export declare class BSNeo3 implements BlockchainService, Claimable {
    dataService: BlockchainDataService & BDSClaimable;
    blockchain: string;
    derivationPath: string;
    feeToken: {
        hash: string;
        symbol: string;
        decimals: number;
    };
    exchange: Exchange;
    private keychain;
    sendTransaction(param: SendTransactionParam): Promise<string>;
    private buildTransfer;
    private signTransfer;
    generateMnemonic(): string;
    generateWif(mnemonic: string, index: number): string;
    generateAccount(mnemonic: string, index: number): {
        wif: string;
        address: string;
    };
    generateAccountFromWif(wif: string): string;
    decryptKey(encryptedKey: string, password: string): Promise<{
        wif: string;
        address: string;
    }>;
    validateAddress(address: string): boolean;
    validateEncryptedKey(encryptedKey: string): boolean;
    validateWif(wif: string): boolean;
    calculateTransferFee(param: SendTransactionParam): Promise<{
        result: number;
        details?: CalculateTransferFeeDetails | undefined;
    }>;
    claim(address: string, account: Account): Promise<{
        txid: string;
        symbol: string;
        hash: string;
    }>;
}
