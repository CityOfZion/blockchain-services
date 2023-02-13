import { Account, BDSClaimable, BlockchainDataService, BlockchainService, CalculateTransferFeeDetails, Claimable, Exchange, SendTransactionParam } from '@cityofzion/blockchain-service';
export declare class BSNeoLegacy implements BlockchainService, Claimable {
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
    private nativeAssets;
    sendTransaction(param: SendTransactionParam): Promise<string>;
    private buildNativeTransaction;
    private buildNep5Transaction;
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
    calculateTransferFee(param: SendTransactionParam, details?: boolean): Promise<{
        result: number;
        details?: CalculateTransferFeeDetails;
    }>;
    claim(address: string, account: Account): Promise<{
        txid: string;
        symbol: string;
        hash: string;
    }>;
}
