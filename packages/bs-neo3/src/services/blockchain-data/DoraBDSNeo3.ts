import {
  BalanceResponse,
  ContractResponse,
  DORA_URL,
  DoraFullTransactionsByAddressResponse,
  FullTransactionAssetEvent,
  FullTransactionNftEvent,
  FullTransactionsByAddressParams,
  FullTransactionsByAddressResponse,
  FullTransactionsItem,
  isDateFromStringGreaterThanDateToString,
  isDateRangeGreaterThanOneYear,
  isFutureDateString,
  isValidDateString,
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
  tryCatch,
  TryCatchResult,
} from '@cityofzion/blockchain-service'
import { NeoRESTApi } from '@cityofzion/dora-ts/dist/api'
import { u, wallet } from '@cityofzion/neon-js'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'
import { RpcBDSNeo3 } from './RpcBDSNeo3'
import axios, { AxiosResponse } from 'axios'

type DoraNeo3FullTransactionsByAddressParams = {
  address: string
  timestampFrom: string
  timestampTo: string
  protocol: 'neo3'
  network: 'mainnet' | 'testnet'
  cursor?: string
}

const NeoRest = new NeoRESTApi({
  doraUrl: DORA_URL,
  endpoint: '/api/v2/neo3',
})

const doraClient = axios.create({ baseURL: DORA_URL })

export class DoraBDSNeo3 extends RpcBDSNeo3 {
  constructor(
    network: Network<BSNeo3NetworkId>,
    feeToken: Token,
    claimToken: Token,
    tokens: Token[],
    nftDataService: NftDataService
  ) {
    super(network, feeToken, claimToken, tokens, nftDataService)
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
        const properties = Array.isArray(state) ? state : state.value
        if (eventName !== 'Transfer' || (properties.length !== 3 && properties.length !== 4)) return

        const promise = async (): Promise<TransactionTransferAsset | TransactionTransferNft> => {
          const isAsset = properties.length === 3

          const from = properties[0].value
          const to = properties[1].value
          const convertedFrom = from ? this.convertByteStringToAddress(from) : 'Mint'
          const convertedTo = to ? this.convertByteStringToAddress(to) : 'Burn'

          if (isAsset) {
            const token = await this.getTokenInfo(contractHash)
            const [, , { value: amount }] = properties
            return {
              amount: u.BigInteger.fromNumber(amount).toDecimal(token.decimals ?? 0),
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
            tokenId: properties[3].value,
            contractHash,
            type: 'nft',
          }
        }

        transferPromises.push(promise())
      })

      const transfers = await Promise.all(transferPromises)

      const notifications = item.notifications.map<TransactionNotifications>(notification => ({
        eventName: notification.event_name,
        state: notification.state as any,
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

  async getFullTransactionsByAddress(
    params: FullTransactionsByAddressParams
  ): Promise<FullTransactionsByAddressResponse> {
    if (BSNeo3Helper.isCustomNet(this._network)) throw new Error('Only Mainnet and Testnet are supported')
    if (!params.dateFrom) throw new Error('Missing dateFrom param')
    if (!params.dateTo) throw new Error('Missing dateTo param')
    if (!isValidDateString(params.dateFrom)) throw new Error('Invalid dateFrom param')
    if (!isValidDateString(params.dateTo)) throw new Error('Invalid dateTo param')
    if (!wallet.isAddress(params.address)) throw new Error('Invalid address param')
    if (isFutureDateString(params.dateFrom) || isFutureDateString(params.dateTo))
      throw new Error('The dateFrom and/or dateTo are in future')
    if (isDateFromStringGreaterThanDateToString(params.dateFrom, params.dateTo))
      throw new Error('Invalid date order because dateFrom is greater than dateTo')
    if (isDateRangeGreaterThanOneYear(params.dateFrom, params.dateTo))
      throw new Error('Date range greater than one year')

    const data: FullTransactionsItem[] = []

    const {
      data: { nextCursor = '', data: items },
    } = await doraClient.post<
      DoraFullTransactionsByAddressResponse,
      AxiosResponse<DoraFullTransactionsByAddressResponse>,
      DoraNeo3FullTransactionsByAddressParams
    >('/api/v2/unified/activity-history', {
      address: params.address,
      timestampFrom: params.dateFrom,
      timestampTo: params.dateTo,
      protocol: 'neo3',
      network: this._network.id as 'mainnet' | 'testnet',
      cursor: params.nextCursor,
    })

    const itemPromises = items.map(async item => {
      const newItem: FullTransactionsItem = {
        txId: item.transactionID,
        block: item.block,
        date: item.date,
        invocationCount: item.invocationCount,
        notificationCount: item.notificationCount,
        networkFeeAmount: item.networkFeeAmount
          ? u.BigInteger.fromDecimal(item.networkFeeAmount, this._feeToken.decimals).toDecimal(this._feeToken.decimals)
          : '0',
        systemFeeAmount: item.systemFeeAmount
          ? u.BigInteger.fromDecimal(item.systemFeeAmount, this._feeToken.decimals).toDecimal(this._feeToken.decimals)
          : '0',
        events: [],
      }

      const eventPromises = item.events.map(async event => {
        let nftEvent: FullTransactionNftEvent
        let assetEvent: FullTransactionAssetEvent
        const { methodName, contractHash: hash } = event
        const from = event.from ?? ''
        const to = event.to ?? ''
        const tokenId = event.tokenID ?? ''
        const [standard] = event.supportedStandards ?? []
        const isNep11 = standard === 'NEP-11'
        const isNep17 = standard === 'NEP-17'
        const isNft = isNep11 && !!tokenId && !!to && !!from
        const [token]: TryCatchResult<Token> = await tryCatch<Token>(() => this.getTokenInfo(hash))
        const amount = event.amount
          ? u.BigInteger.fromNumber(event.amount).toDecimal(token?.decimals ?? event.tokenDecimals)
          : '0'

        if (isNft) {
          const [nft]: TryCatchResult<NftResponse> = await tryCatch<NftResponse>(() =>
            this._nftDataService.getNft({ contractHash: hash, tokenId })
          )

          nftEvent = {
            eventType: 'nft',
            amount,
            methodName,
            from,
            to,
            hash,
            tokenId,
            tokenType: isNep11 ? 'nep11' : 'generic',
            nftImageUrl: nft?.image ?? '',
            name: nft?.name ?? '',
            collectionName: nft?.collectionName ?? '',
          }
        } else
          assetEvent = {
            eventType: 'token',
            amount,
            methodName,
            from: from || 'Burn',
            to: to || 'Mint',
            hash,
            token,
            tokenType: isNep17 ? 'nep17' : 'generic',
          }

        return isNft ? nftEvent! : assetEvent!
      })

      const events = await Promise.allSettled(eventPromises)

      newItem.events = events
        .filter(({ status }) => status === 'fulfilled')
        .map(event => (event as PromiseFulfilledResult<FullTransactionAssetEvent | FullTransactionNftEvent>).value)

      return newItem
    })

    const newItems = await Promise.allSettled(itemPromises)

    data.push(
      ...newItems
        .filter(({ status }) => status === 'fulfilled')
        .map(item => (item as PromiseFulfilledResult<FullTransactionsItem>).value)
    )

    return {
      nextCursor,
      data,
    }
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
}
