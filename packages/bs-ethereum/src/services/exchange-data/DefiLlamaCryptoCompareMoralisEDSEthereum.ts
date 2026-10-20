import {
  DefiLlamaCryptoCompareEDS,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TBSNetworkId,
  type TBSToken,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
  BSError,
  type IExchangeDataService,
} from '@cityofzion/blockchain-service'
import { BSEthereumConstants } from '../../constants/BSEthereumConstants'
import { MoralisBDSEthereum } from '../blockchain-data/MoralisBDSEthereum'
import type { IBSEthereum, TMoralisEthereumErc20PricesResponse } from '../../types'
import { AxiosInstance } from 'axios'

export class DefiLlamaCryptoCompareMoralisEDSEthereum<N extends string, A extends TBSNetworkId>
  extends DefiLlamaCryptoCompareEDS
  implements IExchangeDataService
{
  readonly #numbersOfBlockByHour = (60 / 15) * 60
  readonly #maxTokenPricesPerCall = 24
  readonly #service: IBSEthereum<N, A>

  #apiInstance?: AxiosInstance

  constructor(service: IBSEthereum<N, A>) {
    super()

    this.#service = service
  }

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = MoralisBDSEthereum.getClient(this.#service.network)
    }

    return this.#apiInstance
  }

  async #getWrappedNativeToken(): Promise<TBSToken> {
    const [nativeToken] = this.#service.nativeTokens
    const wrappedSymbol = `W${nativeToken.symbol}`
    const localWrappedHash = BSEthereumConstants.NATIVE_WRAPPED_HASH_BY_NETWORK_ID[this.#service.network.id]

    if (!localWrappedHash) throw new BSError('Wrapper token not found', 'WRAPPER_TOKEN_NOT_FOUND')

    return this.#service.tokenService.normalizeToken({
      ...nativeToken,
      symbol: wrappedSymbol,
      name: wrappedSymbol,
      hash: localWrappedHash,
    })
  }

  protected _getDefiLlamaId({ hash }: TBSToken) {
    if (this.#service.tokenService.isNativeToken(hash)) {
      return `coingecko:${this.#service.name}`
    }

    return `${this.#service.name}:${hash}`
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    let response: TTokenPricesResponse[] = []

    try {
      response = await super.getTokenPrices(params)
    } catch {
      /* empty */
    }

    const symbols = new Set(response.filter(({ usdPrice }) => usdPrice > 0).map(({ token }) => token.symbol))
    const missingTokens = params.tokens.filter(token => !symbols.has(token.symbol))
    const isMoralisSupported = MoralisBDSEthereum.isSupported(this.#service.network)

    if (missingTokens.length === 0 || (!isMoralisSupported && response.length > 0)) {
      return response
    }

    if (!isMoralisSupported) {
      throw new BSError('Moralis exchange is not supported on this network', 'MORALIS_EXCHANGE_NOT_SUPPORTED')
    }

    const [nativeToken] = this.#service.nativeTokens
    const tokensBody: { token_address: string }[] = []
    let wrappedNativeToken: TBSToken | undefined

    if (missingTokens.some(token => token.symbol === nativeToken.symbol)) {
      try {
        wrappedNativeToken = await this.#getWrappedNativeToken()

        if (wrappedNativeToken) {
          tokensBody.push({ token_address: wrappedNativeToken.hash.toLowerCase() })
        }
      } catch {
        /* empty */
      }
    }

    missingTokens.forEach(token => {
      if (token.symbol !== nativeToken.symbol) {
        tokensBody.push({ token_address: token.hash.toLowerCase() })
      }
    })

    if (tokensBody.length === 0) return response

    const splitTokensBody = []

    for (let index = 0; index < tokensBody.length; index += this.#maxTokenPricesPerCall) {
      splitTokensBody.push(tokensBody.slice(index, index + this.#maxTokenPricesPerCall))
    }

    await Promise.allSettled(
      splitTokensBody.map(async body => {
        const { data } = await this.#api.post<TMoralisEthereumErc20PricesResponse[]>('/erc20/prices', {
          tokens: body,
        })

        data.forEach(item => {
          let token: TBSToken

          if (wrappedNativeToken && this.#service.tokenService.predicateByHash(wrappedNativeToken, item.tokenAddress)) {
            token = nativeToken
          } else {
            token = {
              symbol: item.tokenSymbol,
              name: item.tokenName,
              hash: this.#service.tokenService.normalizeHash(item.tokenAddress),
              decimals: Number(item.tokenDecimals),
            }
          }

          response.push({ usdPrice: item.usdPrice, token })
        })
      })
    )

    return response
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    let response: TTokenPricesHistoryResponse[] = []

    try {
      response = await super.getTokenPriceHistory(params)
    } catch {
      /* empty */
    }

    if (response.length > 0) return response

    if (!MoralisBDSEthereum.isSupported(this.#service.network)) {
      throw new BSError('Moralis exchange is not supported on this network', 'MORALIS_EXCHANGE_NOT_SUPPORTED')
    }

    let token: TBSToken

    if (this.#service.tokenService.isNativeToken(params.token.hash)) {
      token = await this.#getWrappedNativeToken()
    } else {
      token = params.token
    }

    const currentBlockNumber = await this.#service.blockchainDataService.getBlockHeight()

    // Last block is not included
    const blockNumber = currentBlockNumber - 1

    const tokensBody = Array.from({ length: 24 }).map((_, index) => ({
      token_address: token.hash,
      to_block: (blockNumber - index * this.#numbersOfBlockByHour).toString(),
    }))

    const splitTokensBody = []

    for (let index = 0; index < tokensBody.length; index += this.#maxTokenPricesPerCall) {
      splitTokensBody.push(tokensBody.slice(index, index + this.#maxTokenPricesPerCall))
    }

    await Promise.allSettled(
      splitTokensBody.map(async body => {
        const { data } = await this.#api.post<TMoralisEthereumErc20PricesResponse[]>('/erc20/prices', {
          tokens: body,
        })

        response.push(
          ...data.map(item => ({
            token: params.token,
            usdPrice: item.usdPrice,
            timestamp: Number(item.blockTimestamp),
          }))
        )
      })
    )

    const timestamps = new Set<number>()

    return response.filter(({ timestamp }) => (timestamps.has(timestamp) ? false : timestamps.add(timestamp)))
  }
}
