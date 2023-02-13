import { BalanceResponse, BlockchainNetwork, BlockchainDataService, ConsensusNodeResponse, ContractResponse, TokenInfoResponse, TransactionHistoryResponse, TransactionResponse, BDSClaimable, UnclaimedResponse } from '@cityofzion/blockchain-service';
export declare class BDSNeoLegacy implements BlockchainDataService, BDSClaimable {
    explorer: string;
    network: BlockchainNetwork;
    private request;
    setNetwork(network: BlockchainNetwork): void;
    getTransaction(txid: string): Promise<TransactionResponse>;
    getHistoryTransactions(address: string, page?: number): Promise<TransactionHistoryResponse>;
    getContract(contractHash: string): Promise<ContractResponse>;
    getTokenInfo(tokenHash: string): Promise<TokenInfoResponse>;
    getBalance(address: string): Promise<BalanceResponse[]>;
    getAllNodes(): Promise<ConsensusNodeResponse[]>;
    getHigherNode(): Promise<ConsensusNodeResponse>;
    getUnclaimed(address: string): Promise<UnclaimedResponse>;
}
