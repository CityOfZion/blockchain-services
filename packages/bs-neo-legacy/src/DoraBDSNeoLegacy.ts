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
  NetworkType,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import { TOKENS } from './constants'

export class DoraBDSNeoLegacy implements BlockchainDataService, BDSClaimable {
  readonly networkType: NetworkType
  private readonly tokenCache: Map<string, Token> = new Map()

  constructor(networkType: NetworkType) {
    if (networkType === 'custom') throw new Error('Custom network is not supported for NEO Legacy')
    this.networkType = networkType
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const data = await api.NeoLegacyREST.transaction(hash, this.networkType)
    const vout: any[] = data.vout ?? []

    const promises = vout.map<Promise<TransactionTransferAsset>>(async (transfer, _index, array) => {
      const token = await this.getTokenInfo(transfer.asset)
      return {
        amount: Number(transfer.value),
        from: array[array.length - 1]?.address,
        contractHash: transfer.asset,
        to: transfer.address,
        type: 'token',
        token,
      }
    })
    const transfers = await Promise.all(promises)

    return {
      hash: data.txid,
      block: data.block,
      fee: Number(data.sys_fee ?? 0) + Number(data.net_fee ?? 0),
      time: Number(data.time),
      notifications: [], //neoLegacy doesn't have notifications
      transfers,
    }
  }

  async getTransactionsByAddress(address: string, page: number = 1): Promise<TransactionHistoryResponse> {
    const data = await api.NeoLegacyREST.getAddressAbstracts(address, page, this.networkType)
    const transactions = new Map<string, TransactionResponse>()

    const promises = data.entries.map(async entry => {
      if (entry.address_from !== address && entry.address_to !== address) return

      const token = await this.getTokenInfo(entry.asset)
      const transfer: TransactionTransferAsset = {
        amount: Number(entry.amount),
        from: entry.address_from ?? 'Mint',
        to: entry.address_to ?? 'Burn',
        type: 'token',
        contractHash: entry.asset,
        token,
      }
      const existingTransaction = transactions.get(entry.txid)
      if (existingTransaction) {
        existingTransaction.transfers.push(transfer)
        return
      }

      transactions.set(entry.txid, {
        block: entry.block_height,
        hash: entry.txid,
        time: entry.time,
        transfers: [transfer],
        notifications: [],
      })
    })
    await Promise.all(promises)

    return {
      totalCount: data.total_entries,
      transactions: Array.from(transactions.values()),
    }
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    const response = await api.NeoLegacyREST.contract(contractHash, this.networkType)
    return {
      hash: response.hash,
      name: response.name,
      methods: [],
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    const localToken = TOKENS[this.networkType].find(token => token.hash === tokenHash)
    if (localToken) return localToken

    if (this.tokenCache.has(tokenHash)) {
      return this.tokenCache.get(tokenHash)!
    }

    const data = await api.NeoLegacyREST.asset(tokenHash, this.networkType)
    const token = {
      decimals: data.decimals,
      symbol: data.symbol,
      hash: data.scripthash,
      name: data.name,
    }

    this.tokenCache.set(tokenHash, token)

    return token
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const data = await api.NeoLegacyREST.balance(address, this.networkType)

    const promises = data.map<Promise<BalanceResponse>>(async balance => {
      const token = await this.getTokenInfo(balance.asset)

      return {
        amount: Number(balance.balance),
        token,
      }
    })

    const result = await Promise.all(promises)

    return result
  }

  async getUnclaimed(address: string): Promise<number> {
    const { unclaimed } = await api.NeoLegacyREST.getUnclaimed(address, this.networkType)
    return unclaimed
  }
}
