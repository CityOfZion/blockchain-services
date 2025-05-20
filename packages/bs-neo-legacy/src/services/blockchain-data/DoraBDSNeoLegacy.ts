import {
  BalanceResponse,
  BDSClaimable,
  BlockchainDataService,
  BSFullTransactionsByAddressHelper,
  BSPromisesHelper,
  ContractResponse,
  ExplorerService,
  ExportTransactionsByAddressParams,
  formatNumber,
  FullTransactionAssetEvent,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  FullTransactionsItem,
  Network,
  RpcResponse,
  Token,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import { rpc, wallet } from '@cityofzion/neon-js'
import { BSNeoLegacyNetworkId } from '../../constants/BSNeoLegacyConstants'
import { BSNeoLegacyHelper } from '../../helpers/BSNeoLegacyHelper'

export class DoraBDSNeoLegacy implements BlockchainDataService, BDSClaimable {
  readonly #supportedNep5Standards = ['nep5', 'nep-5']
  readonly #network: Network<BSNeoLegacyNetworkId>
  readonly #claimToken: Token
  readonly #feeToken: Token
  readonly #tokens: Token[]
  readonly #tokenCache: Map<string, Token> = new Map()
  readonly #explorerService: ExplorerService

  maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2

  constructor(
    network: Network<BSNeoLegacyNetworkId>,
    feeToken: Token,
    claimToken: Token,
    tokens: Token[],
    explorerService: ExplorerService
  ) {
    this.#network = network
    this.#claimToken = claimToken
    this.#feeToken = feeToken
    this.#tokens = tokens
    this.#explorerService = explorerService
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
    nextPageParams = 1,
  }: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    const data = await api.NeoLegacyREST.getAddressAbstracts(address, nextPageParams, this.#network.id)
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

    const totalPages = Math.ceil(data.total_entries / data.page_size)

    return {
      nextPageParams: nextPageParams < totalPages ? nextPageParams + 1 : undefined,
      transactions: Array.from(transactions.values()),
    }
  }

  async getFullTransactionsByAddress(
    params: FullTransactionsByAddressParams
  ): Promise<FullTransactionsByAddressResponse> {
    this.#validateFullTransactionsByAddressParams(params)

    const data: FullTransactionsItem[] = []

    const { nextCursor, ...response } = await api.NeoLegacyREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: 'mainnet',
      cursor: params.nextCursor,
    })

    const items = response.data ?? []

    const addressTemplateUrl = this.#explorerService.getAddressTemplateUrl()
    const txTemplateUrl = this.#explorerService.getTxTemplateUrl()
    const contractTemplateUrl = this.#explorerService.getContractTemplateUrl()

    const itemPromises = items.map(async item => {
      const txId = item.transactionID
      const newItem: FullTransactionsItem = {
        txId,
        txIdUrl: txId ? txTemplateUrl?.replace('{txId}', txId) : undefined,
        block: item.block,
        date: item.date,
        invocationCount: item.invocationCount,
        notificationCount: item.notificationCount,
        networkFeeAmount: formatNumber(item.networkFeeAmount, this.#feeToken.decimals),
        systemFeeAmount: formatNumber(item.systemFeeAmount, this.#feeToken.decimals),
        events: [],
      }

      const eventPromises = item.events.map(async event => {
        const { contractHash: hash, amount, from, to } = event
        const [token] = await BSPromisesHelper.tryCatch<Token>(() => this.getTokenInfo(hash))
        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isNep5 = this.#supportedNep5Standards.includes(standard)
        const toUrl = to ? addressTemplateUrl?.replace('{address}', to) : undefined
        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined
        const hashUrl = hash ? contractTemplateUrl?.replace('{hash}', hash) : undefined

        const assetEvent: FullTransactionAssetEvent = {
          eventType: 'token',
          amount: formatNumber(amount, token?.decimals ?? event.tokenDecimals),
          methodName: event.methodName,
          from: from || 'Mint',
          fromUrl,
          to: to || 'Burn',
          toUrl,
          hash,
          hashUrl,
          token: token ?? undefined,
          tokenType: isNep5 ? 'nep-5' : 'generic',
        }

        newItem.events.push(assetEvent)
      })

      await Promise.allSettled(eventPromises)

      data.push(newItem)
    })

    await Promise.allSettled(itemPromises)

    return { nextCursor, data }
  }

  async exportFullTransactionsByAddress(params: ExportTransactionsByAddressParams): Promise<string> {
    this.#validateFullTransactionsByAddressParams(params)

    return await api.NeoLegacyREST.exportFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: 'mainnet',
    })
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

    return await Promise.all(promises)
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

  #validateFullTransactionsByAddressParams(params: FullTransactionsByAddressParams) {
    if (!BSNeoLegacyHelper.isMainnet(this.#network)) throw new Error('Only Mainnet is supported')

    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams(params)

    if (!wallet.isAddress(params.address)) throw new Error('Invalid address param')
  }
}
