import {
  BalanceResponse,
  BSBigNumberHelper,
  BSFullTransactionsByAddressHelper,
  BSPromisesHelper,
  ContractResponse,
  ExportTransactionsByAddressParams,
  FullTransactionAssetEvent,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  FullTransactionsItem,
  IBlockchainDataService,
  RpcResponse,
  Token,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import { rpc } from '@cityofzion/neon-js'
import { BSNeoLegacyHelper } from '../../helpers/BSNeoLegacyHelper'
import { IBSNeoLegacy, TBSNeoLegacyNetworkId } from '../../types'

export class DoraBDSNeoLegacy<N extends string> implements IBlockchainDataService {
  static readonly SUPPORTED_NEP5_STANDARDS: string[] = ['nep5', 'nep-5']
  static readonly FULL_TRANSACTIONS_API_SUPPORTED_NETWORKS_IDS: TBSNeoLegacyNetworkId[] = ['mainnet']

  readonly maxTimeToConfirmTransactionInMs: number = 1000 * 60 * 2
  readonly #tokenCache: Map<string, Token> = new Map()
  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    this.#service = service
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    const data = await api.NeoLegacyREST.transaction(hash, this.#service.network.id)
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
      fee: (Number(data.sys_fee ?? 0) + Number(data.net_fee ?? 0)).toFixed(this.#service.feeToken.decimals),
      time: Number(data.time),
      notifications: [], //neoLegacy doesn't have notifications
      transfers,
      type: 'default',
    }
  }

  async getTransactionsByAddress({
    address,
    nextPageParams = 1,
  }: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    const data = await api.NeoLegacyREST.getAddressAbstracts(address, nextPageParams, this.#service.network.id)
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
        type: 'default',
      })
    })
    await Promise.all(promises)

    const totalPages = Math.ceil(data.total_entries / data.page_size)

    return {
      nextPageParams: nextPageParams < totalPages ? nextPageParams + 1 : undefined,
      transactions: Array.from(transactions.values()),
    }
  }

  async getFullTransactionsByAddress({
    nextCursor,
    ...params
  }: FullTransactionsByAddressParams): Promise<FullTransactionsByAddressResponse> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      ...params,
      service: this.#service,
      supportedNetworksIds: DoraBDSNeoLegacy.FULL_TRANSACTIONS_API_SUPPORTED_NETWORKS_IDS,
    })

    const data: FullTransactionsItem[] = []

    const response = await api.NeoLegacyREST.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: 'mainnet',
      cursor: nextCursor,
      pageLimit: params.pageSize ?? 30,
    })

    const items = response.data ?? []

    const addressTemplateUrl = this.#service.explorerService.getAddressTemplateUrl()
    const txTemplateUrl = this.#service.explorerService.getTxTemplateUrl()
    const contractTemplateUrl = this.#service.explorerService.getContractTemplateUrl()

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }, index) => {
      const txId = item.transactionID

      const newItem: FullTransactionsItem = {
        txId,
        txIdUrl: txId ? txTemplateUrl?.replace('{txId}', txId) : undefined,
        block: item.block,
        date: item.date,
        invocationCount: item.invocationCount,
        notificationCount: item.notificationCount,
        networkFeeAmount: networkFeeAmount
          ? BSBigNumberHelper.format(networkFeeAmount, { decimals: this.#service.feeToken.decimals })
          : undefined,
        systemFeeAmount: systemFeeAmount
          ? BSBigNumberHelper.format(systemFeeAmount, { decimals: this.#service.feeToken.decimals })
          : undefined,
        events: [],
        type: 'default',
      }

      const eventPromises = item.events.map(async (event, eventIndex) => {
        const { contractHash, amount, from, to } = event
        const [token] = await BSPromisesHelper.tryCatch<Token>(() => this.getTokenInfo(contractHash))
        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isNep5 = DoraBDSNeoLegacy.SUPPORTED_NEP5_STANDARDS.includes(standard)
        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined
        const toUrl = to ? addressTemplateUrl?.replace('{address}', to) : undefined
        const contractHashUrl = contractHash ? contractTemplateUrl?.replace('{hash}', contractHash) : undefined

        const assetEvent: FullTransactionAssetEvent = {
          eventType: 'token',
          amount: amount
            ? BSBigNumberHelper.format(amount, { decimals: token?.decimals ?? event.tokenDecimals })
            : undefined,
          methodName: event.methodName,
          from: from ?? undefined,
          fromUrl,
          to: to ?? undefined,
          toUrl,
          contractHash,
          contractHashUrl,
          token: token ?? undefined,
          tokenType: isNep5 ? 'nep-5' : 'generic',
        }

        newItem.events.splice(eventIndex, 0, assetEvent)
      })

      await Promise.allSettled(eventPromises)

      data.splice(index, 0, newItem)
    })

    await Promise.allSettled(itemPromises)

    return { nextCursor: response.nextCursor, data }
  }

  async exportFullTransactionsByAddress(params: ExportTransactionsByAddressParams): Promise<string> {
    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams({
      ...params,
      service: this.#service,
      supportedNetworksIds: DoraBDSNeoLegacy.FULL_TRANSACTIONS_API_SUPPORTED_NETWORKS_IDS,
    })

    return await api.NeoLegacyREST.exportFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: 'mainnet',
    })
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    const response = await api.NeoLegacyREST.contract(contractHash, this.#service.network.id)
    if (!response || 'error' in response) throw new Error(`Contract ${contractHash} not found`)

    return {
      hash: response.hash,
      name: response.name,
      methods: [],
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    const cachedToken = this.#tokenCache.get(tokenHash)

    if (cachedToken) {
      return cachedToken
    }

    let token = this.#service.tokens.find(token => this.#service.tokenService.predicateByHash(tokenHash, token))

    if (!token) {
      const data = await api.NeoLegacyREST.asset(tokenHash, this.#service.network.id)
      if (!data || 'error' in data) throw new Error(`Token ${tokenHash} not found`)

      token = {
        decimals: Number(data.decimals),
        symbol: data.symbol,
        hash: data.scripthash,
        name: data.name,
      }
    }

    this.#tokenCache.set(tokenHash, this.#service.tokenService.normalizeToken(token))

    return token
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    const data = await api.NeoLegacyREST.balance(address, this.#service.network.id)

    const promises = data.map<Promise<BalanceResponse>>(async balance => {
      let token: Token = this.#service.tokenService.normalizeToken({
        hash: balance.asset,
        name: balance.asset_name,
        symbol: balance.symbol,
        decimals: 8,
      })

      try {
        token = await this.getTokenInfo(balance.asset)
      } catch {
        // Empty block
      }

      return {
        amount: BSBigNumberHelper.format(balance.balance, { decimals: token.decimals }),
        token,
      }
    })

    return await Promise.all(promises)
  }

  async getUnclaimed(address: string): Promise<string> {
    const rpcClient = new rpc.RPCClient(this.#service.network.url)
    const response = await rpcClient.getUnclaimed(address)

    return (response?.unclaimed ?? 0).toFixed(this.#service.claimToken.decimals)
  }

  async getBlockHeight(): Promise<number> {
    const rpcClient = new rpc.RPCClient(this.#service.network.url)
    return await rpcClient.getBlockCount()
  }

  async getRpcList(): Promise<RpcResponse[]> {
    const list: RpcResponse[] = []
    const urls = BSNeoLegacyHelper.getRpcList(this.#service.network)

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
