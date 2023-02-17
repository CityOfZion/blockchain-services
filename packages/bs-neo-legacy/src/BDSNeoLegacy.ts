import { BalanceResponse, BlockchainNetwork, BlockchainDataService, ConsensusNodeResponse, ContractResponse, TokenInfoResponse, TransactionHistoryResponse, TransactionResponse, TransactionTransfer, BDSClaimable, UnclaimedResponse } from '@cityofzion/blockchain-service'
import { rpc } from '@cityofzion/neon-js';
import axios from 'axios'
import { DoraNeoLegacyEntriesEntity, DoraNeoLegacyTransaction } from './explorer/dora/DoraResponsesNeoLegacy';
import { DORA_NEO_LEGACY_TRANSACTION } from './explorer/dora/DoraRoutesNeoLegacy';
import { api } from '@cityofzion/dora-ts'
export class BDSNeoLegacy implements BlockchainDataService, BDSClaimable {
    explorer: string = 'https://dora.coz.io/'
    network: BlockchainNetwork = 'mainnet'
    private request = axios.create({ baseURL: `https://dora.coz.io/api/v1/neo2/${this.network}` })

    setNetwork(network: BlockchainNetwork): void {
        this.network = network
    }
    async getTransaction(txid: string): Promise<TransactionResponse> {
        try {
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
        } catch (error) {
            throw error;
        }
    }

    async getHistoryTransactions(address: string, page: number = 1): Promise<TransactionHistoryResponse> {
        try {
            const data = await api.NeoLegacyREST.getAddressAbstracts(address, page, this.network)
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
        } catch (error) {
            throw error;
        }
    }
    async getContract(contractHash: string): Promise<ContractResponse> {
        try {
            const response = await api.NeoLegacyREST.contract(contractHash, this.network)
            const result: ContractResponse = {
                hash: response.hash,
                name: response.name,
                methods: []
            }
            return result
        } catch (error) {
            throw error;
        }
    }

    async getTokenInfo(tokenHash: string): Promise<TokenInfoResponse> {
        try {
            const data = await api.NeoLegacyREST.asset(tokenHash)
            const result: TokenInfoResponse = {
                decimals: data.decimals,
                symbol: data.symbol
            }
            return result
        } catch (error) {
            throw error;
        }
    }
    async getBalance(address: string): Promise<BalanceResponse[]> {
        try {
            const data = await api.NeoLegacyREST.balance(address, this.network)
            const result: BalanceResponse[] = data.map<BalanceResponse>(balance => {
                return {
                    hash: balance.asset,
                    amount: Number(balance.balance),
                    name: balance.asset_name,
                    symbol: balance.symbol
                }
            })
            return result
        } catch (error) {
            throw error;
        }
    }
    async getAllNodes(): Promise<ConsensusNodeResponse[]> {
        try {
            const data = await api.NeoLegacyREST.getAllNodes()
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
            const data = await api.NeoLegacyREST.getUnclaimed(address)
            const result: UnclaimedResponse = {
                address,
                unclaimed: data.unclaimed,
            }
            return result;
        } catch (error) {
            throw error;
        }
    }
}