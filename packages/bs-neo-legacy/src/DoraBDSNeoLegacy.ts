import {
  BalanceResponse,
  BlockchainDataService,
  ContractResponse,
  TransactionHistoryResponse,
  TransactionResponse,
  BDSClaimable,
  TransactionTransferAsset,
  Token,
  Network,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'

export class DoraBDSNeoLegacy implements BlockchainDataService, BDSClaimable {
  network: Network

  constructor(network: Network) {
    if (network.type === 'custom') throw new Error('Custom network is not supported for NEO Legacy')
    this.network = network
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const data = await api.NeoLegacyREST.transaction(hash, this.network.type)
    const transfers = data.vout
      ? (data.vout as any[]).map<TransactionTransferAsset>((transfer, _index, array) => ({
          amount: transfer.value,
          from: array[array.length - 1]?.address,
          hash: transfer.asset,
          to: transfer.address,
          type: 'asset',
        }))
      : []

    return {
      hash: data.txid,
      block: data.block,
      netfee: data.net_fee ?? '0',
      sysfee: data.sys_fee ?? '0',
      totfee: (Number(data.sys_fee) + Number(data.net_fee)).toString(),
      time: data.time,
      notifications: [], //neoLegacy doesn't have notifications
      transfers,
    }
  }

  async getHistoryTransactions(address: string, page: number = 1): Promise<TransactionHistoryResponse> {
    const data = await api.NeoLegacyREST.getAddressAbstracts(address, page, this.network.type)
    const transactions = new Map<string, TransactionResponse>()

    data.entries.forEach(entry => {
      if (entry.address_from !== address && entry.address_to !== address) return

      const transfer: TransactionTransferAsset = {
        amount: entry.amount.toString(),
        from: entry.address_from ?? 'Mint',
        to: entry.address_to ?? 'Burn',
        type: 'asset',
      }

      const existingTransaction = transactions.get(entry.txid)
      if (existingTransaction) {
        existingTransaction.transfers.push(transfer)
        return
      }

      transactions.set(entry.txid, {
        block: entry.block_height,
        hash: entry.txid,
        netfee: '0',
        sysfee: '0',
        totfee: '0',
        time: entry.time.toString(),
        transfers: [transfer],
        notifications: [],
      })
    })

    return {
      totalCount: data.total_entries,
      transactions: Array.from(transactions.values()),
    }
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    const response = await api.NeoLegacyREST.contract(contractHash, this.network.type)
    return {
      hash: response.hash,
      name: response.name,
      methods: [],
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    const data = await api.NeoLegacyREST.asset(tokenHash, this.network.type)

    return {
      decimals: data.decimals,
      symbol: data.symbol,
      hash: data.scripthash,
      name: data.name,
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const data = await api.NeoLegacyREST.balance(address, this.network.type)

    const promises = data.map<Promise<BalanceResponse>>(async balance => {
      const { decimals } = await this.getTokenInfo(balance.asset)

      return {
        hash: balance.asset,
        amount: Number(balance.balance),
        name: balance.asset_name,
        symbol: balance.symbol,
        decimals,
      }
    })

    const result = await Promise.all(promises)

    return result
  }

  async getUnclaimed(address: string): Promise<number> {
    const { unclaimed } = await api.NeoLegacyREST.getUnclaimed(address, this.network.type)
    return unclaimed
  }
}
