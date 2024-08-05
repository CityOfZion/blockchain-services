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
} from '@cityofzion/blockchain-service'
import { BSEthereumHelper, BSEthereumNetworkId } from './BSEthereumHelper'
import { MoralisBDSEthereum } from './MoralisBDSEthereum'

type MoralisERC20MetadataResponse = {
  address: string
  name: string
  symbol: string
  decimals: string
  possible_spam: boolean
  verified_contract: boolean
}

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

  constructor(network: Network<BSEthereumNetworkId>, blockchainDataService: BlockchainDataService) {
    super()

    this.#network = network
    this.#blockchainDataService = blockchainDataService
  }

  async #getWrappedNativeToken(): Promise<Token> {
    const nativeToken = BSEthereumHelper.getNativeAsset(this.#network)
    const client = MoralisBDSEthereum.getClient(this.#network)
    const { data } = await client.get<MoralisERC20MetadataResponse[]>('/erc20/metadata/symbols', {
      params: {
        symbols: [`W${nativeToken.symbol}`],
      },
    })

    const wrapperToken = data.find(token => token.verified_contract && !token.possible_spam)
    if (!wrapperToken) throw new Error('Wrapper token not found')

    return {
      decimals: Number(wrapperToken.decimals),
      hash: wrapperToken.address,
      name: wrapperToken.name,
      symbol: wrapperToken.symbol,
    }
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSEthereumHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    if (!MoralisBDSEthereum.isSupported(this.#network)) throw new Error('Exchange is not supported on this network')

    const client = MoralisBDSEthereum.getClient(this.#network)
    const nativeToken = BSEthereumHelper.getNativeAsset(this.#network)

    let wrappedNativeToken: Token | undefined
    if (params.tokens.some(token => token.symbol === nativeToken.symbol)) {
      wrappedNativeToken = await this.#getWrappedNativeToken()
    }

    const tokensBody = params.tokens.map(token => {
      if (token.symbol !== nativeToken.symbol) {
        return {
          token_address: token.hash,
        }
      }

      return {
        token_address: wrappedNativeToken!.hash,
      }
    })

    const splitTokensBody = []
    for (let i = 0; i < tokensBody.length; i += this.#maxTokenPricesPerCall) {
      splitTokensBody.push(tokensBody.slice(i, i + this.#maxTokenPricesPerCall))
    }

    const response: TokenPricesResponse[] = []

    await Promise.allSettled(
      splitTokensBody.slice(0, 1).map(async body => {
        const { data } = await client.post<MoralisERC20PriceResponse[]>('/erc20/prices', {
          tokens: body,
        })

        data.forEach(item => {
          let token: Token

          if (
            BSEthereumHelper.normalizeHash(item.tokenAddress) ===
            BSEthereumHelper.normalizeHash(wrappedNativeToken?.hash ?? '')
          ) {
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
    if (BSEthereumHelper.normalizeHash(params.token.hash) === BSEthereumHelper.normalizeHash(nativeToken.hash)) {
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
