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
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

type FlamingoTokenInfoPricesResponse = {
  symbol: string
  usd_price: number
  hash: string
}[]

export class FlamingoEDSNeo3 extends CryptoCompareEDS implements ExchangeDataService {
  readonly #BASE_URL = 'https://neo-api.b-cdn.net/flamingo'
  readonly #network: Network<BSNeo3NetworkId>
  readonly #axiosInstance: AxiosInstance

  constructor(network: Network<BSNeo3NetworkId>) {
    super()

    this.#network = network
    this.#axiosInstance = axios.create({ baseURL: this.#BASE_URL })
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')

    const { data } = await this.#axiosInstance.get<FlamingoTokenInfoPricesResponse>('/live-data/prices/latest')
    const prices = new Map<string, TokenPricesResponse>()
    const { tokens } = params
    const neoSymbol = 'NEO'

    data.forEach(item => {
      const token = tokens.find(
        ({ hash }) => BSNeo3Helper.normalizeHash(hash) === BSNeo3Helper.normalizeHash(item.hash)
      )

      if (!token) return

      const { symbol } = token
      const usdPrice = item.usd_price

      if (symbol === 'bNEO') {
        const neoToken = tokens.find(token => token.symbol === neoSymbol)

        if (neoToken) prices.set(neoSymbol, { usdPrice, token: neoToken })
      }

      prices.set(symbol, { usdPrice, token })
    })

    return [...prices.values()]
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    return await super.getTokenPriceHistory(params)
  }
}
