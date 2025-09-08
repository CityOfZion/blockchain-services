import {
  BalanceResponse,
  ContractResponse,
  BSCommonConstants,
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
  BSPromisesHelper,
  ExplorerService,
  ExportTransactionsByAddressParams,
  BSBigNumberHelper,
  FullTransactionsItemBridgeNeo3NeoX,
  TransactionBridgeNeo3NeoXResponse,
  FullTransactionNftEvent,
  FullTransactionAssetEvent,
  TokenService,
  INeo3NeoXBridgeService,
} from '@cityofzion/blockchain-service'
import { api } from '@cityofzion/dora-ts'
import { u, wallet } from '@cityofzion/neon-js'
import { BSNeo3Constants, BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { RpcBDSNeo3 } from './RpcBDSNeo3'
import { StateResponse } from '@cityofzion/dora-ts/dist/interfaces/api/common'
import { Notification } from '@cityofzion/dora-ts/dist/interfaces/api/neo'

export const DoraNeoRest = new api.NeoRESTApi({
  doraUrl: BSCommonConstants.DORA_URL,
  endpoint: '/api/v2/neo3',
})

export class DoraBDSNeo3 extends RpcBDSNeo3 {
  readonly #supportedNep11Standards = ['nep11', 'nep-11']
  readonly #nftDataService: NftDataService
  readonly #explorerService: ExplorerService
  readonly #neo3NeoXBridgeService: INeo3NeoXBridgeService

  constructor(
    network: Network<BSNeo3NetworkId>,
    feeToken: Token,
    claimToken: Token,
    tokens: Token[],
    nftDataService: NftDataService,
    explorerService: ExplorerService,
    tokenService: TokenService,
    neo3NeoXBridgeService: INeo3NeoXBridgeService
  ) {
    super(network, feeToken, claimToken, tokens, tokenService)

    this.#nftDataService = nftDataService
    this.#explorerService = explorerService
    this.#neo3NeoXBridgeService = neo3NeoXBridgeService
  }

  async getTransaction(hash: string): Promise<TransactionResponse> {
    if (BSNeo3Helper.isCustomNet(this._network)) {
      return await super.getTransaction(hash)
    }

    try {
      const data = await DoraNeoRest.transaction(hash, this._network.id)
      const systemFeeNumber = BSBigNumberHelper.fromNumber(data.sysfee ?? 0)
      const networkFeeNumber = BSBigNumberHelper.fromNumber(data.netfee ?? 0)
      const totalFee = systemFeeNumber.plus(networkFeeNumber)

      return {
        block: data.block,
        time: Number(data.time),
        hash: data.hash,
        fee: BSBigNumberHelper.format(totalFee, { decimals: this._feeToken.decimals }),
        notifications: [],
        transfers: [],
        type: 'default', // It's not possible to set the correct type because we don't have notifications here
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

    const data = await DoraNeoRest.addressTXFull(address, nextPageParams, this._network.id)

    const promises = data.items.map(async (item): Promise<TransactionResponse> => {
      const transferPromises: Promise<TransactionTransferAsset | TransactionTransferNft>[] = []
      const notifications = item.notifications ?? []

      item.notifications.forEach(({ contract: contractHash, state, event_name: eventName }) => {
        const properties = (Array.isArray(state) ? state : state?.value ?? []) as StateResponse[]

        if (eventName !== 'Transfer' || (properties.length !== 3 && properties.length !== 4)) return

        const promise = async (): Promise<TransactionTransferAsset | TransactionTransferNft> => {
          const isAsset = properties.length === 3
          const from = properties[0].value as string
          const to = properties[1].value as string
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
            tokenHash: properties[3].value as string,
            collectionHash: contractHash,
            type: 'nft',
          }
        }

        transferPromises.push(promise())
      })

      const transfers = await Promise.all(transferPromises)
      const systemFeeNumber = BSBigNumberHelper.fromNumber(item.sysfee ?? 0)
      const networkFeeNumber = BSBigNumberHelper.fromNumber(item.netfee ?? 0)
      const totalFee = systemFeeNumber.plus(networkFeeNumber)

      let transaction: TransactionResponse = {
        block: item.block,
        time: Number(item.time),
        hash: item.hash,
        fee: BSBigNumberHelper.format(totalFee, { decimals: this._feeToken.decimals }),
        transfers,
        notifications: notifications.map<TransactionNotifications>(notification => ({
          eventName: notification.event_name,
          state: notification.state,
        })),
        type: 'default',
      }

      const bridgeNeo3NeoXData = this.#getBridgeNeo3NeoXDataByNotifications(notifications)

      if (bridgeNeo3NeoXData) transaction = { ...transaction, type: 'bridgeNeo3NeoX', data: bridgeNeo3NeoXData }

      return transaction
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

    const response = await DoraNeoRest.getFullTransactionsByAddress({
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

    const itemPromises = items.map(async ({ networkFeeAmount, systemFeeAmount, ...item }, index) => {
      const txId = item.transactionID

      let newItem: FullTransactionsItem = {
        txId,
        txIdUrl: txId ? txTemplateUrl?.replace('{txId}', txId) : undefined,
        block: item.block,
        date: item.date,
        invocationCount: item.invocationCount,
        notificationCount: item.notificationCount,
        networkFeeAmount: networkFeeAmount
          ? BSBigNumberHelper.format(networkFeeAmount, { decimals: this._feeToken.decimals })
          : undefined,
        systemFeeAmount: systemFeeAmount
          ? BSBigNumberHelper.format(systemFeeAmount, { decimals: this._feeToken.decimals })
          : undefined,
        events: [],
        type: 'default',
      }

      const eventPromises = item.events.map(async (event, eventIndex) => {
        const { methodName, tokenID: tokenHash, contractHash, contractName } = event
        const from = event.from ?? undefined
        const to = event.to ?? undefined
        const fromUrl = from ? addressTemplateUrl?.replace('{address}', from) : undefined
        const toUrl = to ? addressTemplateUrl?.replace('{address}', to) : undefined
        const contractHashUrl = contractHash ? contractTemplateUrl?.replace('{hash}', contractHash) : undefined
        const standard = event.supportedStandards?.[0]?.toLowerCase() ?? ''
        const isNft = this.#supportedNep11Standards.includes(standard) && !!tokenHash

        if (isNft) {
          const [nft] = await BSPromisesHelper.tryCatch<NftResponse>(() =>
            this.#nftDataService.getNft({ collectionHash: contractHash, tokenHash })
          )

          const nftUrl = contractHash
            ? nftTemplateUrl?.replace('{collectionHash}', contractHash).replace('{tokenHash}', tokenHash)
            : undefined

          const nftEvent: FullTransactionNftEvent = {
            eventType: 'nft',
            amount: undefined,
            methodName,
            from,
            fromUrl,
            to,
            toUrl,
            collectionHash: contractHash,
            collectionHashUrl: contractHashUrl,
            tokenHash,
            tokenType: 'nep-11',
            nftImageUrl: nft?.image,
            nftUrl,
            name: nft?.name,
            collectionName: nft?.collection?.name,
          }

          newItem.events.splice(eventIndex, 0, nftEvent)

          return
        } else {
          const [token] = await BSPromisesHelper.tryCatch<Token>(() => this.getTokenInfo(contractHash))

          const assetEvent: FullTransactionAssetEvent = {
            eventType: 'token',
            amount: event.amount
              ? BSBigNumberHelper.format(event.amount, { decimals: token?.decimals ?? event.tokenDecimals })
              : undefined,
            methodName,
            from,
            fromUrl,
            to,
            toUrl,
            contractHash,
            contractHashUrl,
            token: token ?? undefined,
            tokenType: 'nep-17',
          }

          newItem.events.splice(eventIndex, 0, assetEvent)
        }

        if (newItem.type === 'default' && contractName === 'NeoXBridge') {
          const [log] = await BSPromisesHelper.tryCatch(() => DoraNeoRest.log(txId, this._network.id))

          if (!!log && log.vmstate === 'HALT') {
            const data = this.#getBridgeNeo3NeoXDataByNotifications(log.notifications || [])

            if (data) newItem = { ...newItem, type: 'bridgeNeo3NeoX', data }
          }
        }
      })

      await Promise.allSettled(eventPromises)

      data.splice(index, 0, newItem)
    })

    await Promise.allSettled(itemPromises)

    return { nextCursor: response.nextCursor, data }
  }

  async exportFullTransactionsByAddress(params: ExportTransactionsByAddressParams): Promise<string> {
    this.#validateFullTransactionsByAddressParams(params)

    return await DoraNeoRest.exportFullTransactionsByAddress({
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
      const data = await DoraNeoRest.contract(contractHash, this._network.id)
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

    try {
      const cachedToken = this._tokenCache.get(tokenHash)
      if (cachedToken) {
        return cachedToken
      }

      let token = this._tokens.find(currentToken => this._tokenService.predicateByHash(tokenHash, currentToken.hash))

      if (!token) {
        const { decimals, symbol, name, scripthash } = await DoraNeoRest.asset(tokenHash, this._network.id)
        token = this._tokenService.normalizeToken({
          decimals: Number(decimals),
          symbol,
          name,
          hash: scripthash,
        })
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

    const response = await DoraNeoRest.balance(address, this._network.id)

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

  #validateAddress(address: string): boolean {
    return wallet.isAddress(address, 53)
  }

  #validateFullTransactionsByAddressParams(
    params: Pick<FullTransactionsByAddressParams, 'address' | 'dateFrom' | 'dateTo'>
  ) {
    if (BSNeo3Helper.isCustomNet(this._network)) throw new Error('Only Mainnet and Testnet are supported')

    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams(params)

    if (!this.#validateAddress(params.address)) throw new Error('Invalid address param')
  }

  #validateGetFullTransactionsByAddressParams({
    pageSize,
    ...params
  }: Pick<FullTransactionsByAddressParams, 'address' | 'dateFrom' | 'dateTo' | 'pageSize'>) {
    if (typeof pageSize === 'number' && (isNaN(pageSize) || pageSize < 1 || pageSize > 500))
      throw new Error('Page size should be between 1 and 500')

    this.#validateFullTransactionsByAddressParams(params)
  }

  #getBridgeNeo3NeoXDataByNotifications(
    notifications: Notification[]
  ): FullTransactionsItemBridgeNeo3NeoX['data'] | TransactionBridgeNeo3NeoXResponse['data'] | undefined {
    const gasNotification = notifications.find(({ event_name }) => event_name === 'NativeDeposit')
    const isNativeToken = !!gasNotification

    const neoNotification = !isNativeToken
      ? notifications.find(({ event_name }) => event_name === 'TokenDeposit')
      : undefined

    const notification = isNativeToken ? gasNotification : neoNotification
    const notificationStateValue = (notification?.state as StateResponse)?.value as StateResponse[]

    if (!notificationStateValue) return undefined

    const decimals = isNativeToken ? BSNeo3Constants.GAS_TOKEN.decimals : BSNeo3Constants.NEO_TOKEN.decimals
    const amountIndex = isNativeToken ? 2 : 4
    const amountWithDecimals = (notificationStateValue?.[amountIndex]?.value as string) || 0

    const amount = BSBigNumberHelper.format(u.BigInteger.fromNumber(amountWithDecimals).toDecimal(decimals), {
      decimals,
    })

    const receiverAddressIndex = isNativeToken ? 1 : 3
    const byteStringReceiverAddress = (notificationStateValue?.[receiverAddressIndex]?.value as string) || ''

    if (!byteStringReceiverAddress) return undefined

    const receiverAddress = `0x${u.HexString.fromBase64(byteStringReceiverAddress).toLittleEndian()}`

    const token = this.#neo3NeoXBridgeService.tokens.find(currentToken =>
      this._tokenService.predicateByHash(
        (isNativeToken ? BSNeo3Constants.GAS_TOKEN : BSNeo3Constants.NEO_TOKEN).hash,
        currentToken.hash
      )
    )

    if (!token) return undefined

    return { amount, token, receiverAddress }
  }
}
