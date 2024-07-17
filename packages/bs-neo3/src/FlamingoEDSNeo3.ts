import {
  CryptoCompareEDS,
  Currency,
  ExchangeDataService,
  GetTokenPriceHistory,
  Network,
  Token,
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

  constructor(network: Network<BSNeo3NetworkId>, tokens: Token[]) {
    super(tokens)
    this.#network = network
    this.#axiosInstance = axios.create({ baseURL: 'https://api.flamingo.finance' })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')

    const { data: prices } = await this.#axiosInstance.get<FlamingoTokenInfoPricesResponse>('/token-info/prices')

    let currencyRatio: number = 1

    if (currency !== 'USD') {
      currencyRatio = await this.getCurrencyRatio(currency)
    }

    return prices.map(price => ({
      price: price.usd_price * currencyRatio,
      symbol: price.symbol,
      hash: price.hash,
    }))
  }

  async getTokenPriceHistory(params: GetTokenPriceHistory): Promise<TokenPricesHistoryResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    return await super.getTokenPriceHistory(params)
  }

  private async getCurrencyRatio(currency: Currency): Promise<number> {
    const { data } = await this.#axiosInstance.get<number>(`/fiat/exchange-rate?pair=USD_${currency}`)
    return data
  }
}
