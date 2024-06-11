import {
  CryptoCompareEDS,
  Currency,
  ExchangeDataService,
  NetworkType,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import { TOKENS } from './constants'

type FlamingoTokenInfoPricesResponse = {
  symbol: string
  usd_price: number
  hash: string
}[]

export class FlamingoEDSNeo3 extends CryptoCompareEDS implements ExchangeDataService {
  readonly #networkType: NetworkType
  readonly #axiosInstance: AxiosInstance

  constructor(networkType: NetworkType) {
    super(networkType, TOKENS[networkType])
    this.#networkType = networkType
    this.#axiosInstance = axios.create({ baseURL: 'https://api.flamingo.finance' })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (this.#networkType !== 'mainnet') throw new Error('Exchange is only available on mainnet')

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

  private async getCurrencyRatio(currency: Currency): Promise<number> {
    const { data } = await this.#axiosInstance.get<number>(`/fiat/exchange-rate?pair=USD_${currency}`)
    return data
  }
}
