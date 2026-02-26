import {
  BSBigNumberHelper,
  BSCommonConstants,
  BSUtilsHelper,
  type TBalanceResponse,
  type TContractMethod,
  type TBSToken,
  type TBSNetwork,
  type TBSNetworkId,
  type TContractResponse,
  type TTransaction,
  type TGetTransactionsByAddressResponse,
  type TGetTransactionsByAddressParams,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { ERC20_ABI } from '../../assets/abis/ERC20'
import type {
  IBSEthereum,
  TBSEthereumNetworkId,
  TMoralisBDSEthereumERC20BalanceApiResponse,
  TMoralisBDSEthereumERC20MetadataApiResponse,
  TMoralisBDSEthereumNativeBalanceApiResponse,
  TMoralisBDSEthereumTransactionApiResponse,
  TMoralisTokenMetadataApiResponse,
  TMoralisWalletHistoryApiResponse,
} from '../../types'
import { RpcBDSEthereum } from './RpcBDSEthereum'

export class MoralisBDSEthereum<N extends string, A extends TBSNetworkId> extends RpcBDSEthereum<N, A> {
  static readonly BASE_URL = `${BSCommonConstants.COZ_API_URL}/api/v2/meta`

  // prettier-ignore
  static readonly MORALIS_SUPPORTED_NETWORKS_IDS: TBSEthereumNetworkId[] = [
    '1', '11155111', '17000', '137', '80002', '56', '97', '42161', '421614',
    '8453', '84532', '10', '11155420', '59144', '59141', '43114', '250',
    '4002', '25', '11297108109', '2020', '100', '10200', '88888', '88882',
    '369', '1284', '1285', '1287', '81457', '168587773', '324', '300',
    '5000', '5003', '1101', '2442', '7000', '7001'
  ]

  static getClient(network: TBSNetwork<TBSEthereumNetworkId>) {
    return axios.create({
      baseURL: MoralisBDSEthereum.BASE_URL,
      params: {
        chain: `0x${Number(network.id).toString(16)}`,
      },
    })
  }

  static isSupported(network: TBSNetwork<TBSEthereumNetworkId>) {
    return MoralisBDSEthereum.MORALIS_SUPPORTED_NETWORKS_IDS.includes(network.id)
  }

  #apiInstance?: AxiosInstance

  constructor(service: IBSEthereum<N, A>) {
    super(service)
  }

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = MoralisBDSEthereum.getClient(this._service.network)
    }

    return this.#apiInstance
  }

  async getBalance(address: string): Promise<TBalanceResponse[]> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getBalance(address)
    }

    const {
      data: { balance: nativeBalance },
    } = await this.#api.get<TMoralisBDSEthereumNativeBalanceApiResponse>(`${address}/balance`)

    const nativeToken = BSEthereumHelper.getNativeAsset(this._service.network)

    const balances: TBalanceResponse[] = [
      {
        amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(nativeBalance, nativeToken.decimals), {
          decimals: nativeToken.decimals,
        }),
        token: nativeToken,
      },
    ]

    const { data: erc20Balances } = await this.#api.get<TMoralisBDSEthereumERC20BalanceApiResponse[]>(
      `${address}/erc20`
    )

    erc20Balances.forEach(balance => {
      if (balance.possible_spam || !balance.decimals || !balance.token_address || !balance.symbol) return

      balances.push({
        amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(balance.balance, balance.decimals), {
          decimals: balance.decimals,
        }),
        token: this._service.tokenService.normalizeToken({
          decimals: balance.decimals,
          hash: balance.token_address,
          name: balance.name ?? '',
          symbol: balance.symbol,
        }),
      })
    })

    return balances
  }

  async getTokenInfo(hash: string): Promise<TBSToken> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getTokenInfo(hash)
    }

    const nativeAsset = BSEthereumHelper.getNativeAsset(this._service.network)

    if (this._service.tokenService.predicateByHash(nativeAsset, hash)) return nativeAsset

    if (this._tokenCache.has(hash)) {
      return this._tokenCache.get(hash)!
    }

    const response = await this.#api.get<TMoralisBDSEthereumERC20MetadataApiResponse[]>(`/erc20/metadata`, {
      params: {
        addresses: [hash],
      },
    })

    const data = response.data[0]

    const token = this._service.tokenService.normalizeToken({
      decimals: Number(data.decimals),
      symbol: data.symbol,
      hash,
      name: data.name,
    })

    this._tokenCache.set(hash, token)

    return token
  }

  async getTransaction(hash: string): Promise<TTransaction<N>> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getTransaction(hash)
    }

    const { data } = await this.#api.get<TMoralisBDSEthereumTransactionApiResponse>(`/transaction/${hash}/verbose`)
    const events: TTransaction<N>['events'] = []

    if (data.value && Number(data.value) > 0) {
      const nativeToken = BSEthereumHelper.getNativeAsset(this._service.network)
      const fromUrl = this._service.explorerService.buildAddressUrl(data.from_address)
      const toUrl = this._service.explorerService.buildAddressUrl(data.to_address)

      events.push({
        eventType: 'token',
        amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(data.value, nativeToken.decimals), {
          decimals: nativeToken.decimals,
        }),
        from: data.from_address,
        to: data.to_address,
        token: nativeToken,
        contractHash: nativeToken.hash,
        tokenType: 'native',
        methodName: 'transfer',
        contractHashUrl: this._service.explorerService.buildContractUrl(nativeToken.hash),
        fromUrl,
        toUrl,
      })
    }

    if (data.logs) {
      const promises = data.logs.map(async log => {
        if (!log.decoded_event) return
        if (log.decoded_event.label.toLowerCase() !== 'transfer') return

        const contractHash = log.address
        const amount = log.decoded_event.params.find((param: any) => param.name === 'value')?.value
        const from = log.decoded_event.params.find((param: any) => param.name === 'from')?.value
        const to = log.decoded_event.params.find((param: any) => param.name === 'to')?.value

        if (!from || !to) return

        const fromUrl = this._service.explorerService.buildAddressUrl(data.from_address)
        const toUrl = this._service.explorerService.buildAddressUrl(data.to_address)

        if (amount) {
          const token = await this.getTokenInfo(contractHash)

          events.push({
            contractHash,
            amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(amount, token.decimals), {
              decimals: token.decimals,
            }),
            from,
            fromUrl,
            to,
            toUrl,
            eventType: 'token',
            methodName: 'transfer',
            tokenType: 'erc-20',
            contractHashUrl: this._service.explorerService.buildContractUrl(contractHash),
          })
        }

        const tokenHash = log.decoded_event.params.find((param: any) => param.name === 'tokenId')?.value
        if (!tokenHash) return

        const [nft] = await BSUtilsHelper.tryCatch(() =>
          this._service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
        )

        events.push({
          collectionHash: contractHash,
          tokenHash,
          from,
          fromUrl,
          to,
          toUrl,
          eventType: 'nft',
          methodName: 'transfer',
          tokenType: 'erc-721',
          amount: '1',
          nftImageUrl: nft?.image,
          nftUrl: nft?.explorerUri,
          name: nft?.name,
          collectionName: nft?.collection?.name,
          collectionHashUrl: nft?.collection?.url,
        })
      })

      await Promise.allSettled(promises)
    }

    return {
      txId: hash,
      block: Number(data.block_number),
      date: new Date(data.block_timestamp).toJSON(),
      invocationCount: 0,
      notificationCount: 0,
      networkFeeAmount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(data.transaction_fee), {
        decimals: this._service.feeToken.decimals,
      }),
      txIdUrl: this._service.explorerService.buildTransactionUrl(hash),
      events,
      type: 'default',
    }
  }

  async getTransactionsByAddress(
    params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N>> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getTransactionsByAddress(params)
    }

    const { data } = await this.#api.get<TMoralisWalletHistoryApiResponse>(`/wallets/${params.address}/history`, {
      params: {
        limit: 15,
        cursor: params.nextPageParams,
      },
    })

    const transactions: TTransaction<N>[] = []
    const nativeAsset = BSEthereumHelper.getNativeAsset(this._service.network)

    const promises = data.result.map(async (item, index) => {
      const events: TTransaction<N>['events'] = []

      item.native_transfers.forEach(transfer => {
        const fromUrl = this._service.explorerService.buildAddressUrl(transfer.from_address)
        const toUrl = this._service.explorerService.buildAddressUrl(transfer.to_address)

        events.push({
          amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(transfer.value, nativeAsset.decimals), {
            decimals: nativeAsset.decimals,
          }),
          from: transfer.from_address,
          fromUrl,
          to: transfer.to_address,
          toUrl,
          eventType: 'token',
          token: nativeAsset,
          contractHash: nativeAsset.hash,
          methodName: 'transfer',
          tokenType: 'native',
          contractHashUrl: this._service.explorerService.buildContractUrl(nativeAsset.hash),
        })
      })

      item.erc20_transfers.forEach(transfer => {
        if (transfer.possible_spam) return

        const fromUrl = this._service.explorerService.buildAddressUrl(transfer.from_address)
        const toUrl = this._service.explorerService.buildAddressUrl(transfer.to_address)

        events.push({
          amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(transfer.value, transfer.token_decimals), {
            decimals: transfer.token_decimals,
          }),
          from: transfer.from_address,
          fromUrl,
          to: transfer.to_address,
          toUrl,
          eventType: 'token',
          token: this._service.tokenService.normalizeToken({
            decimals: Number(transfer.token_decimals),
            hash: transfer.address,
            name: transfer.token_name,
            symbol: transfer.token_symbol,
          }),
          contractHash: transfer.address,
          methodName: 'transfer',
          tokenType: 'erc-20',
          contractHashUrl: this._service.explorerService.buildContractUrl(transfer.address),
        })
      })

      const nftPromises = item.nft_transfers.map(async transfer => {
        const fromUrl = this._service.explorerService.buildAddressUrl(transfer.from_address)
        const toUrl = this._service.explorerService.buildAddressUrl(transfer.to_address)

        const [nft] = await BSUtilsHelper.tryCatch(() =>
          this._service.nftDataService.getNft({ collectionHash: transfer.token_address, tokenHash: transfer.token_id })
        )

        events.push({
          collectionHash: transfer.token_address,
          collectionHashUrl: nft?.collection?.url,
          tokenHash: transfer.token_id,
          from: transfer.from_address,
          fromUrl,
          to: transfer.to_address,
          toUrl,
          eventType: 'nft',
          methodName: 'transfer',
          tokenType: 'erc-721',
          amount: '1',
          nftImageUrl: nft?.image,
          nftUrl: nft?.explorerUri,
          name: nft?.name,
          collectionName: nft?.collection?.name,
        })
      })

      await Promise.allSettled(nftPromises)

      transactions.splice(index, 0, {
        block: Number(item.block_number),
        txId: item.hash,
        txIdUrl: this._service.explorerService.buildTransactionUrl(item.hash),
        notificationCount: 0,
        invocationCount: 0,
        networkFeeAmount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(item.transaction_fee), {
          decimals: this._service.feeToken.decimals,
        }),
        date: new Date(item.block_timestamp).toJSON(),
        events,
        type: 'default',
      })
    })

    await Promise.allSettled(promises)

    return {
      nextPageParams: data.cursor,
      transactions,
    }
  }

  async getContract(hash: string): Promise<TContractResponse> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getContract(hash)
    }

    try {
      const { data } = await this.#api.get<TMoralisTokenMetadataApiResponse[]>(`erc20/metadata`, {
        params: {
          addresses: [hash],
        },
      })

      const methods: TContractMethod[] = []

      ERC20_ABI.forEach(abi => {
        if (abi.type !== 'function') return

        const parameters = abi.inputs?.map(param => ({
          name: param.name,
          type: param.type,
        }))

        methods.push({
          name: abi.name ?? '',
          parameters: parameters ?? [],
        })
      })

      return {
        hash,
        name: data[0].name,
        methods,
      }
    } catch {
      throw new Error('Contract not found or not an ERC20 token')
    }
  }
}
