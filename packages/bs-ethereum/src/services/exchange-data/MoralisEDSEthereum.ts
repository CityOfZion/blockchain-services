import {
  BlockchainDataService,
  CryptoCompareEDS,
  ExchangeDataService,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  Token,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
  TokenService,
} from '@cityofzion/blockchain-service'
import { BSEthereumConstants, BSEthereumNetworkId } from '../../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'
import { MoralisBDSEthereum } from '../blockchain-data/MoralisBDSEthereum'

type MoralisERC20PriceResponse = {
  tokenName: string
  tokenSymbol: string
  tokenDecimals: string
  usdPrice: number
  tokenAddress: string
  blockTimestamp: string
}

export class MoralisEDSEthereum extends CryptoCompareEDS implements ExchangeDataService {
  readonly #network: Network<BSEthereumNetworkId>
  readonly #blockchainDataService: BlockchainDataService
  readonly #numberOfBlockByHour = (15 / 60) * 60
  readonly #numberOfBlockByDay = this.#numberOfBlockByHour * 24
  readonly #maxTokenPricesPerCall = 24
  readonly #tokenService: TokenService

  constructor(
    network: Network<BSEthereumNetworkId>,
    blockchainDataService: BlockchainDataService,
    tokenService: TokenService
  ) {
    super()

    this.#network = network
    this.#blockchainDataService = blockchainDataService
    this.#tokenService = tokenService
  }

  async #getWrappedNativeToken(): Promise<Token> {
    const nativeToken = BSEthereumHelper.getNativeAsset(this.#network)
    const wrappedSymbol = `W${nativeToken.symbol}`
    const localWrappedHash = BSEthereumConstants.NATIVE_WRAPPED_HASH_BY_NETWORK_ID[this.#network.id]
    if (!localWrappedHash) throw new Error('Wrapper token not found')

    return this.#tokenService.normalizeToken({
      ...nativeToken,
      symbol: wrappedSymbol,
      hash: localWrappedHash,
    })
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSEthereumHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    if (!MoralisBDSEthereum.isSupported(this.#network)) throw new Error('Exchange is not supported on this network')

    const client = MoralisBDSEthereum.getClient(this.#network)
    const nativeToken = BSEthereumHelper.getNativeAsset(this.#network)
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
    for (let i = 0; i < tokensBody.length; i += this.#maxTokenPricesPerCall) {
      splitTokensBody.push(tokensBody.slice(i, i + this.#maxTokenPricesPerCall))
    }

    const response: TokenPricesResponse[] = []

    await Promise.allSettled(
      splitTokensBody.map(async body => {
        const { data } = await client.post<MoralisERC20PriceResponse[]>('/erc20/prices', {
          tokens: body,
        })

        data.forEach(item => {
          let token: Token
          if (wrappedNativeToken && this.#tokenService.predicateByHash(wrappedNativeToken)(item.tokenAddress)) {
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
    if (!BSEthereumHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    if (!MoralisBDSEthereum.isSupported(this.#network)) throw new Error('Exchange is not supported on this network')

    const nativeToken = BSEthereumHelper.getNativeAsset(this.#network)

    let token: Token
    if (this.#tokenService.predicateByHash(nativeToken)(params.token)) {
      token = await this.#getWrappedNativeToken()
    } else {
      token = params.token
    }

    const client = MoralisBDSEthereum.getClient(this.#network)
    const currentBlockNumber = (await this.#blockchainDataService.getBlockHeight()) - 1 // Last block is not included

    const tokensBody = Array.from({ length: params.limit }).map((_, index) => ({
      token_address: token.hash,
      to_block:
        currentBlockNumber - index * (params.type === 'hour' ? this.#numberOfBlockByHour : this.#numberOfBlockByDay),
    }))

    const splitTokensBody = []
    for (let i = 0; i < tokensBody.length; i += this.#maxTokenPricesPerCall) {
      splitTokensBody.push(tokensBody.slice(i, i + this.#maxTokenPricesPerCall))
    }

    const history: TokenPricesHistoryResponse[] = []

    await Promise.allSettled(
      splitTokensBody.map(async body => {
        const priceResponse = await client.post<MoralisERC20PriceResponse[]>('/erc20/prices', { tokens: body })

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
