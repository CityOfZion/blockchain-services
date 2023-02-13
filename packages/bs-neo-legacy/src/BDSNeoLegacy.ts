import { BalanceResponse, BlockchainNetwork, BlockchainDataService, ConsensusNodeResponse, ContractResponse, TokenInfoResponse, TransactionHistoryResponse, TransactionResponse, TransactionTransfer, BDSClaimable, UnclaimedResponse } from '@cityofzion/blockchain-service'
import { rpc } from '@cityofzion/neon-js';
import axios from 'axios'
import { unclaimedTokenNeoLegacy } from './constants';
import { DoraNeoLegacyBalance, DoraNeoLegacyConsensusNode, DoraNeoLegacyEntriesEntity, DoraNeoLegacyTransaction, DoraNeoLegacyTransactionsHistory, DoraNeoLegacyUnclaimed } from './explorer/dora/DoraResponsesNeoLegacy';
import { DORA_NEO_LEGACY_BALANCE, DORA_NEO_LEGACY_HISTORY_TRANSACTIONS, DORA_NEO_LEGACY_NODES, DORA_NEO_LEGACY_TRANSACTION, DORA_NEO_LEGACY_UNCLAIMED } from './explorer/dora/DoraRoutesNeoLegacy';
export class BDSNeoLegacy implements BlockchainDataService, BDSClaimable {
    explorer: string = 'https://dora.coz.io/'
    network: BlockchainNetwork = 'mainnet'
    private request = axios.create({ baseURL: `https://dora.coz.io/api/v1/neo2/${this.network}` })

    setNetwork(network: BlockchainNetwork): void {
        this.network = network
    }
    async getTransaction(txid: string): Promise<TransactionResponse> {
        const { data } = await this.request.get<DoraNeoLegacyTransaction>(`/${DORA_NEO_LEGACY_TRANSACTION}/${txid}`)
        const result: TransactionResponse = {
            block: data.block,
            netfee: data.net_fee,
            sysfee: data.sys_fee,
            time: data.time,
            txid: data.txid,
            totfee: (Number(data.sys_fee) + Number(data.net_fee)).toString(),
            notifications: [], //neolegacy doesn't have notifications
            transfers: data.vout.map<Omit<TransactionTransfer, "txid">>((transfer) => {
                return {
                    amount: transfer.value,
                    from: data.vout[data.vout.length - 1]?.address,
                    hash: transfer.asset,
                    to: transfer.address
                }
            })
        }
        return result
    }

    async getHistoryTransactions(address: string, page: number = 1): Promise<TransactionHistoryResponse> {
        const { data } = await this.request.get<DoraNeoLegacyTransactionsHistory>(`${DORA_NEO_LEGACY_HISTORY_TRANSACTIONS}/${address}/${page}`)
        const entriesGroupByTxid: { [txid: string]: DoraNeoLegacyEntriesEntity[] } = {}
        const transactionsGroupByTxid: TransactionResponse[] = []

        data.entries.forEach((entry) => {
            entriesGroupByTxid[entry.txid] = data.entries.filter(it => it.txid === entry.txid)
            const haveTransaction = transactionsGroupByTxid.find(it => it.txid === entry.txid)
            if (!haveTransaction) {
                transactionsGroupByTxid.push({
                    block: entry.block_height,
                    netfee: '0',
                    sysfee: '0',
                    totfee: '0',
                    txid: entry.txid,
                    notifications: [],
                    time: entry.time.toString(),
                    transfers: entriesGroupByTxid[entry.txid].map<Omit<TransactionTransfer, "txid">>((entryGrouped) => {
                        return {
                            amount: entryGrouped.amount.toString(),
                            from: entryGrouped.address_from,
                            to: entryGrouped.address_to,
                            hash: entryGrouped.asset
                        }
                    })
                })
            } else {
                haveTransaction.transfers = entriesGroupByTxid[entry.txid].map<Omit<TransactionTransfer, "txid">>((entryGrouped) => {
                    return {
                        amount: entryGrouped.amount.toString(),
                        from: entryGrouped.address_from,
                        to: entryGrouped.address_to,
                        hash: entryGrouped.asset
                    }
                })
                transactionsGroupByTxid[transactionsGroupByTxid.indexOf(haveTransaction)] = haveTransaction
            }
        })

        const result: TransactionHistoryResponse = {
            totalCount: data.total_entries,
            transactions: transactionsGroupByTxid
        }
        return result
    }
    async getContract(contractHash: string): Promise<ContractResponse> {
        const url = (await this.getHigherNode()).url
        const rpcClient = new rpc.RPCClient(url)
        const response: { result: { hash: string, name: string } } = await rpcClient.execute(
            new rpc.Query({
                method: 'getcontractstate',
                params: [contractHash]
            })
        )

        const result: ContractResponse = {
            hash: response.result.hash,
            name: response.result.name,
            methods: []
        }

        return result
    }

    async getTokenInfo(tokenHash: string): Promise<TokenInfoResponse> {
        //inconsistency on api
        throw new Error('Depending of script hash the return change and get equal to contract');
    }
    async getBalance(address: string): Promise<BalanceResponse[]> {
        const { data } = await this.request.get<DoraNeoLegacyBalance[]>(`/${DORA_NEO_LEGACY_BALANCE}/${address}`)
        const result: BalanceResponse[] = data.map<BalanceResponse>(balance => {
            return {
                hash: balance.asset,
                amount: Number(balance.balance),
                name: balance.asset_name,
                symbol: balance.symbol
            }
        })
        return result
    }
    async getAllNodes(): Promise<ConsensusNodeResponse[]> {
        const { data } = await this.request.get<DoraNeoLegacyConsensusNode[]>(`/${DORA_NEO_LEGACY_NODES}`)
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
        const { data } = await this.request.get<DoraNeoLegacyUnclaimed>(`/${DORA_NEO_LEGACY_UNCLAIMED}/${address}`)
        const result: UnclaimedResponse = {
            address,
            unclaimed: data.unclaimed,
        }
        return result;
    }

}