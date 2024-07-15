import {
  CryptoCompareEDS,
  Currency,
  ExchangeDataService,
  GetTokenPriceHistory,
  Token,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import { AvailableNetworkIds } from './BSNeo3Helper'

type FlamingoTokenInfoPricesResponse = {
  symbol: string
  usd_price: number
  hash: string
}[]

export class FlamingoEDSNeo3 extends CryptoCompareEDS implements ExchangeDataService {
  readonly #networkId: AvailableNetworkIds
  readonly #axiosInstance: AxiosInstance

  constructor(networkId: AvailableNetworkIds, tokens: Token[]) {
    super(tokens)
    this.#networkId = networkId
    this.#axiosInstance = axios.create({ baseURL: 'https://api.flamingo.finance' })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (this.#networkId !== 'mainnet') throw new Error('Exchange is only available on mainnet')

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

  getTokenPriceHistory(params: GetTokenPriceHistory): Promise<TokenPricesHistoryResponse[]> {
    if (this.#networkId !== 'mainnet') throw new Error('Exchange is only available on mainnet')
    return super.getTokenPriceHistory(params)
  }

  private async getCurrencyRatio(currency: Currency): Promise<number> {
    const { data } = await this.#axiosInstance.get<number>(`/fiat/exchange-rate?pair=USD_${currency}`)
    return data
  }
}
