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
  type TGetTransactionsByAddressResponse,
  type TGetTransactionsByAddressParams,
  type TTransactionDefault,
  type TTransactionDefaultEvent,
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
import { BSEthereumConstants } from '../../constants/BSEthereumConstants'

export class MoralisBDSEthereum<N extends string, A extends TBSNetworkId> extends RpcBDSEthereum<N, A> {
  static readonly BASE_URL = `${BSCommonConstants.COZ_API_URL}/api/v2/meta`

  static getClient(network: TBSNetwork<TBSEthereumNetworkId>) {
    return axios.create({
      baseURL: MoralisBDSEthereum.BASE_URL,
      params: {
        chain: `0x${Number(network.id).toString(16)}`,
      },
    })
  }

  static isSupported(network: TBSNetwork<TBSEthereumNetworkId>) {
    return BSEthereumConstants.MORALIS_SUPPORTED_NETWORKS_IDS.includes(network.id)
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

    const response = await this.#api.get<TMoralisBDSEthereumERC20MetadataApiResponse[]>('/erc20/metadata', {
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

  async getTransaction(hash: string): Promise<TTransactionDefault<N>> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getTransaction(hash)
    }

    const { data } = await this.#api.get<TMoralisBDSEthereumTransactionApiResponse>(`/transaction/${hash}/verbose`)
    const events: TTransactionDefaultEvent[] = []

    if (data.value && Number(data.value) > 0) {
      const nativeToken = BSEthereumHelper.getNativeAsset(this._service.network)
      const fromUrl = this._service.explorerService.buildAddressUrl(data.from_address)
      const toUrl = this._service.explorerService.buildAddressUrl(data.to_address)

      events.push({
        eventType: 'token',
        amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(data.value, nativeToken.decimals), {
          decimals: nativeToken.decimals,
        }),
        methodName: 'transfer',
        from: data.from_address,
        fromUrl,
        to: data.to_address,
        toUrl,
        tokenUrl: this._service.explorerService.buildContractUrl(nativeToken.hash),
        token: nativeToken,
      })
    }

    if (data.logs) {
      const promises = data.logs.map(async log => {
        if (!log.decoded_event) return
        if (log.decoded_event.label.toLowerCase() !== 'transfer') return

        const contractHash = log.address
        const amount = log.decoded_event.params.find((param: any) => param.name === 'value')?.value
        const from = log.decoded_event.params.find((param: any) => param.name === 'from')?.value || data.from_address
        const to = log.decoded_event.params.find((param: any) => param.name === 'to')?.value || data.to_address

        if (!from || !to) return

        const fromUrl = this._service.explorerService.buildAddressUrl(from)
        const toUrl = this._service.explorerService.buildAddressUrl(to)

        if (amount) {
          const token = await this.getTokenInfo(contractHash)

          events.push({
            eventType: 'token',
            amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(amount, token.decimals), {
              decimals: token.decimals,
            }),
            methodName: 'transfer',
            from,
            fromUrl,
            to,
            toUrl,
            tokenUrl: this._service.explorerService.buildContractUrl(token.hash),
            token,
          })
        }

        const tokenHash = log.decoded_event.params.find((param: any) => param.name === 'tokenId')?.value
        if (!tokenHash) return

        const [nft] = await BSUtilsHelper.tryCatch(() =>
          this._service.nftDataService.getNft({ collectionHash: contractHash, tokenHash })
        )

        events.push({
          eventType: 'nft',
          amount: '1',
          methodName: 'transfer',
          from,
          fromUrl,
          to,
          toUrl,
          nft,
        })
      })

      await Promise.allSettled(promises)
    }

    return {
      blockchain: this._service.name,
      isPending: false,
      txId: hash,
      txIdUrl: this._service.explorerService.buildTransactionUrl(hash),
      block: Number(data.block_number),
      date: new Date(data.block_timestamp).toJSON(),
      networkFeeAmount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(data.transaction_fee), {
        decimals: this._service.feeToken.decimals,
      }),
      view: 'default',
      events,
    }
  }

  async getTransactionsByAddress(
    params: TGetTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N, TTransactionDefault<N>>> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getTransactionsByAddress(params)
    }

    const { data } = await this.#api.get<TMoralisWalletHistoryApiResponse>(`/wallets/${params.address}/history`, {
      params: {
        limit: 15,
        cursor: params.nextPageParams,
      },
    })

    const transactions: TTransactionDefault<N>[] = []
    const nativeAsset = BSEthereumHelper.getNativeAsset(this._service.network)

    const promises = data.result.map(async (item, index) => {
      const events: TTransactionDefaultEvent[] = []

      item.native_transfers.forEach(transfer => {
        const fromUrl = this._service.explorerService.buildAddressUrl(transfer.from_address)
        const toUrl = this._service.explorerService.buildAddressUrl(transfer.to_address)

        events.push({
          eventType: 'token',
          amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(transfer.value, nativeAsset.decimals), {
            decimals: nativeAsset.decimals,
          }),
          methodName: 'transfer',
          from: transfer.from_address,
          fromUrl,
          to: transfer.to_address,
          toUrl,
          tokenUrl: this._service.explorerService.buildContractUrl(nativeAsset.hash),
          token: nativeAsset,
        })
      })

      item.erc20_transfers.forEach(transfer => {
        if (transfer.possible_spam) return

        const fromUrl = this._service.explorerService.buildAddressUrl(transfer.from_address)
        const toUrl = this._service.explorerService.buildAddressUrl(transfer.to_address)
        const tokenDecimals = transfer.token_decimals

        const token = this._service.tokenService.normalizeToken({
          decimals: Number(tokenDecimals),
          hash: transfer.address,
          name: transfer.token_name,
          symbol: transfer.token_symbol,
        })

        events.push({
          eventType: 'token',
          amount: BSBigNumberHelper.format(BSBigNumberHelper.fromDecimals(transfer.value, tokenDecimals), {
            decimals: tokenDecimals,
          }),
          methodName: 'transfer',
          from: transfer.from_address,
          fromUrl,
          to: transfer.to_address,
          toUrl,
          tokenUrl: this._service.explorerService.buildContractUrl(token.hash),
          token,
        })
      })

      const nftPromises = item.nft_transfers.map(async transfer => {
        const fromUrl = this._service.explorerService.buildAddressUrl(transfer.from_address)
        const toUrl = this._service.explorerService.buildAddressUrl(transfer.to_address)
        const tokenHash = transfer.token_id

        const [nft] = await BSUtilsHelper.tryCatch(() =>
          this._service.nftDataService.getNft({ collectionHash: transfer.token_address, tokenHash })
        )

        events.push({
          eventType: 'nft',
          amount: '1',
          methodName: 'transfer',
          from: transfer.from_address,
          fromUrl,
          to: transfer.to_address,
          toUrl,
          nft,
        })
      })

      await Promise.allSettled(nftPromises)

      transactions.splice(index, 0, {
        blockchain: this._service.name,
        isPending: false,
        txId: item.hash,
        txIdUrl: this._service.explorerService.buildTransactionUrl(item.hash),
        block: Number(item.block_number),
        date: new Date(item.block_timestamp).toJSON(),
        networkFeeAmount: BSBigNumberHelper.format(BSBigNumberHelper.fromNumber(item.transaction_fee), {
          decimals: this._service.feeToken.decimals,
        }),
        view: 'default',
        events,
      })
    })

    await Promise.allSettled(promises)

    return { nextPageParams: data.cursor, transactions }
  }

  async getContract(hash: string): Promise<TContractResponse> {
    if (!MoralisBDSEthereum.isSupported(this._service.network)) {
      return super.getContract(hash)
    }

    try {
      const { data } = await this.#api.get<TMoralisTokenMetadataApiResponse[]>('erc20/metadata', {
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
