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
  Network,
  RpcResponse,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import { rpc } from '@cityofzion/neon-js'
import { BSNeoLegacyNetworkId, BSNeoLegacyHelper } from './BSNeoLegacyHelper'

export class DoraBDSNeoLegacy implements BlockchainDataService, BDSClaimable {
  readonly #network: Network<BSNeoLegacyNetworkId>
  readonly #claimToken: Token
  readonly #feeToken: Token
  readonly #tokens: Token[]
  readonly #tokenCache: Map<string, Token> = new Map()

  maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2

  constructor(network: Network<BSNeoLegacyNetworkId>, feeToken: Token, claimToken: Token, tokens: Token[]) {
    this.#network = network
    this.#claimToken = claimToken
    this.#feeToken = feeToken
    this.#tokens = tokens
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const data = await api.NeoLegacyREST.transaction(hash, this.#network.id)
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
      fee: (Number(data.sys_fee ?? 0) + Number(data.net_fee ?? 0)).toFixed(this.#feeToken.decimals),
      time: Number(data.time),
      notifications: [], //neoLegacy doesn't have notifications
      transfers,
    }
  }

  async getTransactionsByAddress({
    address,
    page = 1,
  }: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    const data = await api.NeoLegacyREST.getAddressAbstracts(address, page, this.#network.id)
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
    const response = await api.NeoLegacyREST.contract(contractHash, this.#network.id)
    if (!response || 'error' in response) throw new Error(`Contract ${contractHash} not found`)

    return {
      hash: response.hash,
      name: response.name,
      methods: [],
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    const localToken = this.#tokens.find(
      token => BSNeoLegacyHelper.normalizeHash(token.hash) === BSNeoLegacyHelper.normalizeHash(tokenHash)
    )
    if (localToken) return localToken

    if (this.#tokenCache.has(tokenHash)) {
      return this.#tokenCache.get(tokenHash)!
    }

    const data = await api.NeoLegacyREST.asset(tokenHash, this.#network.id)
    if (!data || 'error' in data) throw new Error(`Token ${tokenHash} not found`)

    const token = {
      decimals: Number(data.decimals),
      symbol: data.symbol,
      hash: data.scripthash,
      name: data.name,
    }

    this.#tokenCache.set(tokenHash, token)

    return token
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const data = await api.NeoLegacyREST.balance(address, this.#network.id)

    const promises = data.map<Promise<BalanceResponse>>(async balance => {
      const hash = BSNeoLegacyHelper.normalizeHash(balance.asset)

      let token: Token = {
        hash,
        name: balance.asset_name,
        symbol: balance.symbol,
        decimals: 8,
      }

      try {
        token = await this.getTokenInfo(hash)
      } catch {
        // Empty block
      }

      return {
        amount: Number(balance.balance).toFixed(token.decimals),
        token,
      }
    })

    const result = await Promise.all(promises)

    return result
  }

  async getUnclaimed(address: string): Promise<string> {
    const { unclaimed } = await api.NeoLegacyREST.getUnclaimed(address, this.#network.id)
    return (unclaimed / 10 ** this.#claimToken.decimals).toFixed(this.#claimToken.decimals)
  }

  async getBlockHeight(): Promise<number> {
    const rpcClient = new rpc.RPCClient(this.#network.url)
    return await rpcClient.getBlockCount()
  }

  async getRpcList(): Promise<RpcResponse[]> {
    const list: RpcResponse[] = []
    const urls = BSNeoLegacyHelper.getRpcList(this.#network)

    const promises = urls.map(url => {
      // eslint-disable-next-line no-async-promise-executor
      return new Promise<void>(async resolve => {
        const timeout = setTimeout(() => {
          resolve()
        }, 5000)

        try {
          const rpcClient = new rpc.RPCClient(url)

          const timeStart = Date.now()
          const height = await rpcClient.getBlockCount()
          const latency = Date.now() - timeStart

          list.push({ url, latency, height })
        } finally {
          resolve()
          clearTimeout(timeout)
        }
      })
    })

    await Promise.allSettled(promises)

    return list
  }
}
