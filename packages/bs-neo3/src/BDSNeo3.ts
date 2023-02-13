import { BalanceResponse, BlockchainNetwork, BlockchainDataService, ConsensusNodeResponse, ContractResponse, TokenInfoResponse, TransactionHistoryResponse, TransactionResponse, TransactionTransfer, BDSClaimable, UnclaimedResponse, } from "@cityofzion/blockchain-service";
import { rpc } from "@cityofzion/neon-js";
import axios from 'axios'
import { DoraNeo3Asset, DoraNeo3Balance, DoraNeo3ConsensusNode, DoraNeo3Contract, DoraNeo3Transaction, DoraNeo3TransactionHistory } from "./explorer/dora/DoraNeo3Responses";
import { DORA_BALANCE, DORA_CONTRACT, DORA_NODES, DORA_TRANSACTION, DORA_TRANSACTIONS, } from "./explorer/dora/DoraNeo3Routes";

export class BDSNeo3 implements BlockchainDataService, BDSClaimable {
    explorer: string = 'https://dora.coz.io'
    network: BlockchainNetwork = 'mainnet'
    private request = axios.create({ baseURL: `https://dora.coz.io/api/v1/neo3/${this.network}` })
    setNetwork(network: BlockchainNetwork): void {
        this.network = network
    }
    async getTransaction(txid: string): Promise<TransactionResponse> {
        const { data } = await this.request.get<DoraNeo3Transaction>(`/${DORA_TRANSACTION}/${txid}`)
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
        const { data } = await this.request.get<DoraNeo3TransactionHistory>(`/${DORA_TRANSACTIONS}/${address}/${page}`)
        if (!data) throw new Error("query getHistoryTransactions failed");
        const result: TransactionHistoryResponse = {
            totalCount: data.totalCount,
            transactions: data.items.map<TransactionResponse>(item => {
                return {
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
                        }
                    }),
                    notifications: item.notifications
                }
            })
        }
        return result
    }
    async getContract(contractHash: string): Promise<ContractResponse> {
        const { data } = await this.request.get<DoraNeo3Contract>(`/${DORA_CONTRACT}/${contractHash}`)
        if (!data) throw new Error("query getContract failed");
        const result: ContractResponse = {
            hash: data.hash,
            methods: data.manifest.abi.methods,
            name: data.manifest.name
        }
        return result
    }

    async getTokenInfo(tokenHash: string): Promise<TokenInfoResponse> {
        const { data } = await this.request.get<DoraNeo3Asset>(`/${DORA_CONTRACT}/${tokenHash}`);
        if (!data) throw new Error("query getTokenInfo failed");
        const result: TokenInfoResponse = {
            decimals: Number(data.decimals),
            symbol: data.symbol
        }
        return result
    }
    async getBalance(address: string): Promise<BalanceResponse[]> {
        const { data } = await this.request.get<DoraNeo3Balance[]>(`/${DORA_BALANCE}/${address}`)
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
    }
    async getAllNodes(): Promise<ConsensusNodeResponse[]> {
        const { data } = await this.request.get<DoraNeo3ConsensusNode[]>(`/${DORA_NODES}`)
        const result: ConsensusNodeResponse[] = data
        return result
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
        const url = (await this.getHigherNode()).url
        const rpcClient = new rpc.RPCClient(url)
        const response = await rpcClient.getUnclaimedGas(address)
        const result: UnclaimedResponse = {
            address,
            unclaimed: Number(response),
        }
        return result;
    }
}