import {
  BalanceResponse,
  BlockchainDataService,
  ContractResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionResponse,
  BDSClaimable,
  TransactionTransferAsset,
  Token,
  NetworkType,
  Network,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import { TOKENS } from './constants'
import { rpc } from '@cityofzion/neon-js'

export class DoraBDSNeoLegacy implements BlockchainDataService, BDSClaimable {
  readonly network: Network
  private readonly claimToken: Token
  private readonly feeToken: Token
  private readonly tokenCache: Map<string, Token> = new Map()

  constructor(network: Network, feeToken: Token, claimToken: Token) {
    if (network.type === 'custom') throw new Error('Custom network is not supported for NEO Legacy')
    this.network = network
    this.claimToken = claimToken
    this.feeToken = feeToken
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const data = await api.NeoLegacyREST.transaction(hash, this.network.type)
    if (!data || 'error' in data) throw new Error(`Transaction ${hash} not found`)

    const vout: any[] = data.vout ?? []

    const promises = vout.map<Promise<TransactionTransferAsset>>(async (transfer, _index, array) => {
      const token = await this.getTokenInfo(transfer.asset)
      return {
        amount: String(transfer.value),
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
      fee: (Number(data.sys_fee ?? 0) + Number(data.net_fee ?? 0)).toFixed(this.feeToken.decimals),
      time: Number(data.time),
      notifications: [], //neoLegacy doesn't have notifications
      transfers,
    }
  }

  async getTransactionsByAddress({
    address,
    page = 1,
  }: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    const data = await api.NeoLegacyREST.getAddressAbstracts(address, page, this.network.type)
    const transactions = new Map<string, TransactionResponse>()

    const promises = data.entries.map(async entry => {
      if (entry.address_from !== address && entry.address_to !== address) return

      const token = await this.getTokenInfo(entry.asset)
      const transfer: TransactionTransferAsset = {
        amount: String(entry.amount),
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
      limit: data.page_size,
      transactions: Array.from(transactions.values()),
    }
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    const response = await api.NeoLegacyREST.contract(contractHash, this.network.type)
    if (!response || 'error' in response) throw new Error(`Contract ${contractHash} not found`)

    return {
      hash: response.hash,
      name: response.name,
      methods: [],
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    const localToken = TOKENS[this.network.type].find(token => token.hash === tokenHash)
    if (localToken) return localToken

    if (this.tokenCache.has(tokenHash)) {
      return this.tokenCache.get(tokenHash)!
    }

    const data = await api.NeoLegacyREST.asset(tokenHash, this.network.type)
    if (!data || 'error' in data) throw new Error(`Token ${tokenHash} not found`)

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
    const data = await api.NeoLegacyREST.balance(address, this.network.type)

    const promises = data.map<Promise<BalanceResponse>>(async balance => {
      let token: Token = {
        hash: balance.asset,
        name: balance.asset_name,
        symbol: balance.symbol,
        decimals: 8,
      }

      try {
        token = await this.getTokenInfo(balance.asset)
      } catch {}

      return {
        amount: Number(balance.balance).toFixed(token.decimals),
        token,
      }
    })

    const result = await Promise.all(promises)

    return result
  }

  async getUnclaimed(address: string): Promise<string> {
    const { unclaimed } = await api.NeoLegacyREST.getUnclaimed(address, this.network.type)
    return (unclaimed / 10 ** this.claimToken.decimals).toFixed(this.claimToken.decimals)
  }

  async getBlockHeight(): Promise<number> {
    const rpcClient = new rpc.RPCClient(this.network.url)
    return await rpcClient.getBlockCount()
  }
}
