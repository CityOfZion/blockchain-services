import {
  CryptoCompareEDS,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  TNetworkId,
  Token,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSEthereumConstants } from '../../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { MoralisBDSEthereum } from '../blockchain-data/MoralisBDSEthereum'
import { IBSEthereum, TMoralisEDSEthereumERC20PriceApiResponse } from '../../types'

export class MoralisEDSEthereum<N extends string, A extends TNetworkId> extends CryptoCompareEDS {
  static readonly NUMBERS_OF_BLOCK_BY_HOUR = (15 / 60) * 60
  static readonly NUMBER_OF_BLOCK_BY_DAY = MoralisEDSEthereum.NUMBERS_OF_BLOCK_BY_HOUR * 24
  static readonly MAX_TOKEN_PRICES_PER_CALL = 24

  readonly #service: IBSEthereum<N, A>

  constructor(service: IBSEthereum<N, A>) {
    super()

    this.#service = service
  }

  async #getWrappedNativeToken(): Promise<Token> {
    const nativeToken = BSEthereumHelper.getNativeAsset(this.#service.network)
    const wrappedSymbol = `W${nativeToken.symbol}`
    const localWrappedHash = BSEthereumConstants.NATIVE_WRAPPED_HASH_BY_NETWORK_ID[this.#service.network.id]
    if (!localWrappedHash) throw new Error('Wrapper token not found')

    return this.#service.tokenService.normalizeToken({
      ...nativeToken,
      symbol: wrappedSymbol,
      hash: localWrappedHash,
    })
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSEthereumHelper.isMainnetNetwork(this.#service)) throw new Error('Exchange is only available on mainnet')

    if (!MoralisBDSEthereum.isSupported(this.#service.network))
      throw new Error('Exchange is not supported on this network')

    const client = MoralisBDSEthereum.getClient(this.#service.network)
    const nativeToken = BSEthereumHelper.getNativeAsset(this.#service.network)
    const tokensBody: { token_address: string }[] = []
    let wrappedNativeToken: Token | undefined

    if (params.tokens.some(token => token.symbol === nativeToken.symbol)) {
      try {
        wrappedNativeToken = await this.#getWrappedNativeToken()

        if (wrappedNativeToken) {
          tokensBody.push({ token_address: wrappedNativeToken.hash })
        }
      } catch {
        /* empty */
      }
    }

    params.tokens.forEach(token => {
      if (token.symbol !== nativeToken.symbol) {
        tokensBody.push({ token_address: token.hash })
      }
    })

    if (tokensBody.length === 0) return []

    const splitTokensBody = []
    for (let i = 0; i < tokensBody.length; i += MoralisEDSEthereum.MAX_TOKEN_PRICES_PER_CALL) {
      splitTokensBody.push(tokensBody.slice(i, i + MoralisEDSEthereum.MAX_TOKEN_PRICES_PER_CALL))
    }

    const response: TokenPricesResponse[] = []

    await Promise.allSettled(
      splitTokensBody.map(async body => {
        const { data } = await client.post<TMoralisEDSEthereumERC20PriceApiResponse[]>('/erc20/prices', {
          tokens: body,
        })

        data.forEach(item => {
          let token: Token
          if (wrappedNativeToken && this.#service.tokenService.predicateByHash(wrappedNativeToken, item.tokenAddress)) {
            token = nativeToken
          } else {
            token = {
              decimals: Number(item.tokenDecimals),
              hash: item.tokenAddress,
              name: item.tokenName,
              symbol: item.tokenSymbol,
            }
          }

          response.push({
            usdPrice: item.usdPrice,
            token,
          })
        })
      })
    )

    return response
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    if (!BSEthereumHelper.isMainnetNetwork(this.#service)) throw new Error('Exchange is only available on mainnet')
    if (!MoralisBDSEthereum.isSupported(this.#service.network))
      throw new Error('Exchange is not supported on this network')

    const nativeToken = BSEthereumHelper.getNativeAsset(this.#service.network)

    let token: Token
    if (this.#service.tokenService.predicateByHash(nativeToken, params.token)) {
      token = await this.#getWrappedNativeToken()
    } else {
      token = params.token
    }

    const client = MoralisBDSEthereum.getClient(this.#service.network)
    const currentBlockNumber = (await this.#service.blockchainDataService.getBlockHeight()) - 1 // Last block is not included

    const tokensBody = Array.from({ length: params.limit }).map((_, index) => ({
      token_address: token.hash,
      to_block:
        currentBlockNumber -
        index *
          (params.type === 'hour'
            ? MoralisEDSEthereum.NUMBERS_OF_BLOCK_BY_HOUR
            : MoralisEDSEthereum.NUMBER_OF_BLOCK_BY_DAY),
    }))

    const splitTokensBody = []
    for (let i = 0; i < tokensBody.length; i += MoralisEDSEthereum.MAX_TOKEN_PRICES_PER_CALL) {
      splitTokensBody.push(tokensBody.slice(i, i + MoralisEDSEthereum.MAX_TOKEN_PRICES_PER_CALL))
    }

    const history: TokenPricesHistoryResponse[] = []

    await Promise.allSettled(
      splitTokensBody.map(async body => {
        const priceResponse = await client.post<TMoralisEDSEthereumERC20PriceApiResponse[]>('/erc20/prices', {
          tokens: body,
        })

        priceResponse.data.forEach(item => {
          history.push({
            timestamp: Number(item.blockTimestamp),
            usdPrice: item.usdPrice,
            token: params.token,
          })
        })
      })
    )

    return history
  }
}
