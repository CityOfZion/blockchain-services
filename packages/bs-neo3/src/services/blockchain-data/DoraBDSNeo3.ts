import {
  BalanceResponse,
  ContractResponse,
  BSCommonConstants,
  FullTransactionAssetEvent,
  FullTransactionNftEvent,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  FullTransactionsItem,
  Network,
  NftDataService,
  NftResponse,
  Token,
  TransactionNotifications,
  TransactionResponse,
  TransactionsByAddressParams,
  TransactionsByAddressResponse,
  TransactionTransferAsset,
  TransactionTransferNft,
  BSFullTransactionsByAddressHelper,
  formatNumber,
  BSPromisesHelper,
  ExplorerService,
  ExportTransactionsByAddressParams,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import { u, wallet } from '@cityofzion/neon-js'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { RpcBDSNeo3 } from './RpcBDSNeo3'
import { StateResponse } from '@cityofzion/dora-ts/dist/interfaces/api/common'

const NeoRest = new api.NeoRESTApi({
  doraUrl: BSCommonConstants.DORA_URL,
  endpoint: '/api/v2/neo3',
})

export class DoraBDSNeo3 extends RpcBDSNeo3 {
  readonly #supportedNep11Standards = ['nep11', 'nep-11']
  readonly #nftDataService: NftDataService
  readonly #explorerService: ExplorerService

  constructor(
    network: Network<BSNeo3NetworkId>,
    feeToken: Token,
    claimToken: Token,
    tokens: Token[],
    nftDataService: NftDataService,
    explorerService: ExplorerService
  ) {
    super(network, feeToken, claimToken, tokens)

    this.#nftDataService = nftDataService
    this.#explorerService = explorerService
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    if (BSNeo3Helper.isCustomNet(this._network)) {
      return await super.getTransaction(hash)
    }

    try {
      const data = await NeoRest.transaction(hash, this._network.id)
      return {
        block: data.block,
        time: Number(data.time),
        hash: data.hash,
        fee: u.BigInteger.fromNumber(data.netfee ?? 0)
          .add(u.BigInteger.fromNumber(data.sysfee ?? 0))
          .toDecimal(this._feeToken.decimals),
        notifications: [],
        transfers: [],
      }
    } catch {
      throw new Error(`Transaction not found: ${hash}`)
    }
  }

  async getTransactionsByAddress({
    address,
    nextPageParams = 1,
  }: TransactionsByAddressParams): Promise<TransactionsByAddressResponse> {
    if (BSNeo3Helper.isCustomNet(this._network)) {
      return await super.getTransactionsByAddress({ address, nextPageParams })
    }

    const data = await NeoRest.addressTXFull(address, nextPageParams, this._network.id)

    const promises = data.items.map(async (item): Promise<TransactionResponse> => {
      const transferPromises: Promise<TransactionTransferAsset | TransactionTransferNft>[] = []

      item.notifications.forEach(({ contract: contractHash, state, event_name: eventName }) => {
        const properties = Array.isArray(state) ? state : state?.value ?? []

        if (eventName !== 'Transfer' || (properties.length !== 3 && properties.length !== 4)) return

        const promise = async (): Promise<TransactionTransferAsset | TransactionTransferNft> => {
          const isAsset = properties.length === 3
          const from = (properties[0] as StateResponse).value as string
          const to = (properties[1] as StateResponse).value as string
          const convertedFrom = from ? this.convertByteStringToAddress(from) : 'Mint'
          const convertedTo = to ? this.convertByteStringToAddress(to) : 'Burn'

          if (isAsset) {
            const token = await this.getTokenInfo(contractHash)
            const amount = (properties[2] as StateResponse).value as string

            return {
              amount: amount ? u.BigInteger.fromNumber(amount).toDecimal(token.decimals ?? 0) : '0',
              from: convertedFrom,
              to: convertedTo,
              contractHash,
              type: 'token',
              token,
            }
          }

          return {
            from: convertedFrom,
            to: convertedTo,
            tokenId: (properties[3] as StateResponse).value as string,
            contractHash,
            type: 'nft',
          }
        }

        transferPromises.push(promise())
      })

      const transfers = await Promise.all(transferPromises)

      const notifications = item.notifications.map<TransactionNotifications>(notification => ({
        eventName: notification.event_name,
        state: notification.state,
      }))

      return {
        block: item.block,
        time: Number(item.time),
        hash: item.hash,
        fee: u.BigInteger.fromNumber(item.netfee ?? 0)
          .add(u.BigInteger.fromNumber(item.sysfee ?? 0))
          .toDecimal(this._feeToken.decimals),
        transfers,
        notifications,
      }
    })

    const transactions = await Promise.all(promises)

    const limit = 15
    const totalPages = Math.ceil(data.totalCount / limit)

    return {
      nextPageParams: nextPageParams < totalPages ? nextPageParams + 1 : undefined,
      transactions,
    }
  }

  async getFullTransactionsByAddress({
    nextCursor,
    ...params
  }: FullTransactionsByAddressParams): Promise<FullTransactionsByAddressResponse> {
    this.#validateGetFullTransactionsByAddressParams(params)

    const data: FullTransactionsItem[] = []

    const response = await NeoRest.getFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this._network.id as 'mainnet' | 'testnet',
      cursor: nextCursor,
      pageLimit: params.pageSize ?? 50,
    })

    const items = response.data ?? []

    const addressTemplateUrl = this.#explorerService.getAddressTemplateUrl()
    const txTemplateUrl = this.#explorerService.getTxTemplateUrl()
    const nftTemplateUrl = this.#explorerService.getNftTemplateUrl()
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
        networkFeeAmount: formatNumber(item.networkFeeAmount, this._feeToken.decimals),
        systemFeeAmount: formatNumber(item.systemFeeAmount, this._feeToken.decimals),
        events: [],
      }

      const eventPromises = item.events.map(async event => {
        let nftEvent: FullTransactionNftEvent
        let assetEvent: FullTransactionAssetEvent
        let from = event.from
        let to = event.to

        const { methodName, tokenID: tokenId, contractHash: hash } = event

        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined
        const toUrl = to ? addressTemplateUrl?.replace('{address}', to) : undefined
        const hashUrl = hash ? contractTemplateUrl?.replace('{hash}', hash) : undefined

        if (!from) from = 'Mint'
        if (!to) to = 'Burn'

        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isNft = this.#supportedNep11Standards.includes(standard) && !!tokenId

        if (isNft) {
          const [nft] = await BSPromisesHelper.tryCatch<NftResponse>(() =>
            this.#nftDataService.getNft({ contractHash: hash, tokenId })
          )

          const nftUrl = hash ? nftTemplateUrl?.replace('{hash}', hash).replace('{tokenId}', tokenId) : undefined

          nftEvent = {
            eventType: 'nft',
            amount: '0',
            methodName,
            from,
            fromUrl,
            to,
            toUrl,
            hash,
            hashUrl,
            tokenId,
            tokenType: 'nep-11',
            nftImageUrl: nft?.image,
            nftUrl,
            name: nft?.name,
            collectionName: nft?.collectionName,
          }
        } else {
          const [token] = await BSPromisesHelper.tryCatch<Token>(() => this.getTokenInfo(hash))
          const amount = formatNumber(event.amount, token?.decimals ?? event.tokenDecimals)

          assetEvent = {
            eventType: 'token',
            amount,
            methodName,
            from,
            fromUrl,
            to,
            toUrl,
            hash,
            hashUrl,
            token: token ?? undefined,
            tokenType: 'nep-17',
          }
        }

        newItem.events.push(isNft ? nftEvent! : assetEvent!)
      })

      await Promise.allSettled(eventPromises)

      data.push(newItem)
    })

    await Promise.allSettled(itemPromises)

    return { nextCursor: response.nextCursor, data }
  }

  async exportFullTransactionsByAddress(params: ExportTransactionsByAddressParams): Promise<string> {
    this.#validateFullTransactionsByAddressParams(params)

    return await NeoRest.exportFullTransactionsByAddress({
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      network: this._network.id as 'mainnet' | 'testnet',
    })
  }

  async getContract(contractHash: string): Promise<ContractResponse> {
    if (BSNeo3Helper.isCustomNet(this._network)) {
      return await super.getContract(contractHash)
    }

    try {
      const data = await NeoRest.contract(contractHash, this._network.id)
      return {
        hash: data.hash,
        methods: data.manifest.abi?.methods ?? [],
        name: data.manifest.name,
      }
    } catch {
      throw new Error(`Contract not found: ${contractHash}`)
    }
  }

  async getTokenInfo(tokenHash: string): Promise<Token> {
    if (BSNeo3Helper.isCustomNet(this._network)) {
      return await super.getTokenInfo(tokenHash)
    }

    const localToken = this._tokens.find(token => token.hash === tokenHash)
    if (localToken) return localToken

    if (this._tokenCache.has(tokenHash)) {
      return this._tokenCache.get(tokenHash)!
    }

    try {
      const { decimals, symbol, name, scripthash } = await NeoRest.asset(tokenHash, this._network.id)
      const token = {
        decimals: Number(decimals),
        symbol,
        name,
        hash: scripthash,
      }
      this._tokenCache.set(tokenHash, token)

      return token
    } catch {
      throw new Error(`Token not found: ${tokenHash}`)
    }
  }

  async getBalance(address: string): Promise<BalanceResponse[]> {
    if (BSNeo3Helper.isCustomNet(this._network)) {
      return await super.getBalance(address)
    }

    const response = await NeoRest.balance(address, this._network.id)

    const promises = response.map<Promise<BalanceResponse | undefined>>(async balance => {
      try {
        const token = await this.getTokenInfo(balance.asset)
        return {
          amount: balance.balance.toString(),
          token,
        }
      } catch {
        // Empty block
      }
    })
    const balances = await Promise.all(promises)

    return balances.filter(balance => balance !== undefined) as BalanceResponse[]
  }

  private convertByteStringToAddress(byteString: string): string {
    const account = new wallet.Account(u.reverseHex(u.HexString.fromBase64(byteString).toString()))

    return account.address
  }

  #validateFullTransactionsByAddressParams(
    params: Pick<FullTransactionsByAddressParams, 'address' | 'dateFrom' | 'dateTo'>
  ) {
    if (BSNeo3Helper.isCustomNet(this._network)) throw new Error('Only Mainnet and Testnet are supported')

    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams(params)

    if (!wallet.isAddress(params.address)) throw new Error('Invalid address param')
  }

  #validateGetFullTransactionsByAddressParams({
    pageSize,
    ...params
  }: Pick<FullTransactionsByAddressParams, 'address' | 'dateFrom' | 'dateTo' | 'pageSize'>) {
    if (typeof pageSize === 'number' && (isNaN(pageSize) || pageSize < 1 || pageSize > 500))
      throw new Error('Page size should be between 1 and 500')

    this.#validateFullTransactionsByAddressParams(params)
  }
}
