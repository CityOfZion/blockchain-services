import {
  CryptoCompareEDS,
  ExchangeDataService,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import { BSNeo3Helper, BSNeo3NetworkId } from './BSNeo3Helper'

type FlamingoTokenInfoPricesResponse = {
  symbol: string
  usd_price: number
  hash: string
}[]

export class FlamingoEDSNeo3 extends CryptoCompareEDS implements ExchangeDataService {
  readonly #network: Network<BSNeo3NetworkId>
  readonly #axiosInstance: AxiosInstance

  constructor(network: Network<BSNeo3NetworkId>) {
    super()

    this.#network = network
    this.#axiosInstance = axios.create({ baseURL: 'https://api.flamingo.finance' })
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')

    const { data } = await this.#axiosInstance.get<FlamingoTokenInfoPricesResponse>('/token-info/prices')

    const prices: TokenPricesResponse[] = []

    data.forEach(item => {
      const token = params.tokens.find(
        token => BSNeo3Helper.normalizeHash(token.hash) === BSNeo3Helper.normalizeHash(item.hash)
      )
      if (!token) return

      prices.push({
        usdPrice: item.usd_price,
        token,
      })
    })

    return prices
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    return await super.getTokenPriceHistory(params)
  }
}
