import { BalanceResponse, BlockchainNetwork, BlockchainDataService, ConsensusNodeResponse, ContractResponse, TokenInfoResponse, TransactionHistoryResponse, TransactionResponse, TransactionTransfer, BDSClaimable, UnclaimedResponse, TransactionNotifications, } from "@cityofzion/blockchain-service";
import { rpc } from "@cityofzion/neon-js";
import { api } from '@cityofzion/dora-ts'
import { TypedResponse } from "@cityofzion/dora-ts/dist/interfaces/api/common";
export class BDSNeo3 implements BlockchainDataService, BDSClaimable {
    explorer: string = 'https://dora.coz.io'
    network: BlockchainNetwork = 'mainnet'
    setNetwork(network: BlockchainNetwork): void {
        this.network = network
    }
    async getTransaction(txid: string): Promise<TransactionResponse> {
        try {
            const data = await api.NeoRest.transaction(txid, this.network)
            const transaction = await this.findTransactionByTxid(txid, data.sender)
            if (!data || !transaction) throw new Error("query getTransaction failed");
            const result: TransactionResponse = {
                block: data.block,
                time: data.time,
                txid: data.hash,
                netfee: data.netfee,
                sysfee: data.sysfee,
                totfee: (Number(data.netfee) + Number(data.sysfee)).toString(),
                notifications: transaction.notifications,
                transfers: transaction.transfers
            }
            return result
        } catch (error) {
            throw error;
        }
    }
    private async findTransactionByTxid(txid: string, address: string) {
        try {
            let transaction: TransactionResponse | undefined = undefined
            let page: number = 1
            let stop: boolean = false
            while (!stop) {
                const transactionHistory = await this.getHistoryTransactions(address, page)
                transaction = transactionHistory.transactions.find(tx => tx.txid === txid)
                if (transaction) {
                    stop = true
                } else {
                    page++
                }
            }
            if (!transaction) throw new Error(`Problem to build the transfers of transaction => ${txid}`);

            return transaction
        } catch (error) {
            throw new Error(`Problem to build the transfers of transaction => ${txid}`);
        }
    }
    async getHistoryTransactions(address: string, page: number = 1): Promise<TransactionHistoryResponse> {
        try {
            const data = await api.NeoRest.addressTXFull(address, page, this.network)
            if (!data) throw new Error("query getHistoryTransactions failed");
            const result: TransactionHistoryResponse = {
                totalCount: data.totalCount,
                transactions: data.items.map<TransactionResponse>(item => ({
                    block: item.block,
                    time: item.time,
                    txid: item.hash,
                    netfee: item.netfee,
                    sysfee: item.sysfee,
                    totfee: (Number(item.sysfee) + Number(item.netfee)).toString(),
                    transfers: item.transfers.map<Omit<TransactionTransfer, "txid">>(transfer => {
                        return {
                            amount: transfer.amount,
                            from: transfer.from,
                            to: transfer.to,
                            hash: transfer.scripthash
                        };
                    }),
                    notifications: item.notifications.map<TransactionNotifications>(notification => ({
                        contract: notification.contract,
                        event_name: notification.event_name,
                        state: notification.state as any as TypedResponse[]
                    }))
                }))
            }
            data.items.forEach(item => {
                item.transfers
            })
            return result
        } catch (error) {
            throw error;
        }
    }
    async getContract(contractHash: string): Promise<ContractResponse> {
        try {
            const data = await api.NeoRest.contract(contractHash, this.network)
            if (!data) throw new Error("query getContract failed");
            const result: ContractResponse = {
                hash: data.hash,
                methods: data.manifest.abi.methods,
                name: data.manifest.name
            }
            return result
        } catch (error) {
            throw error;
        }
    }

    async getTokenInfo(tokenHash: string): Promise<TokenInfoResponse> {
        try {
            const data = await api.NeoRest.asset(tokenHash, this.network)
            if (!data) throw new Error("query getTokenInfo failed");
            const result: TokenInfoResponse = {
                decimals: Number(data.decimals),
                symbol: data.symbol
            }
            return result
        } catch (error) {
            throw error;
        }
    }
    async getBalance(address: string): Promise<BalanceResponse[]> {
        try {
            const data = await api.NeoRest.balance(address, this.network)
            if (!data) throw new Error("query getBalance failed");
            const result: BalanceResponse[] = data.map<BalanceResponse>(balance => {
                return {
                    amount: Number(balance.balance),
                    hash: balance.asset,
                    name: balance.asset_name,
                    symbol: balance.symbol,
                }
            })
            return result
        } catch (error) {
            throw error;
        }
    }
    async getAllNodes(): Promise<ConsensusNodeResponse[]> {
        try {
            const data = await api.NeoRest.getAllNodes()
            const result: ConsensusNodeResponse[] = data
            return result
        } catch (error) {
            throw error;
        }
    }
    async getHigherNode(): Promise<ConsensusNodeResponse> {
        const nodes = await this.getAllNodes()
        const node = nodes.reduce((bestNode, node) => {
            if (bestNode.height >= node.height) {
                return bestNode
            }
            return node
        })
        return node
    }

    //Implementation of BDSClaimable
    async getUnclaimed(address: string): Promise<UnclaimedResponse> {
        try {
            const url = (await this.getHigherNode()).url
            const rpcClient = new rpc.RPCClient(url)
            const response = await rpcClient.getUnclaimedGas(address)
            const result: UnclaimedResponse = {
                address,
                unclaimed: Number(response),
            }
            return result;
        } catch (error) {
            throw error;
        }
    }
}