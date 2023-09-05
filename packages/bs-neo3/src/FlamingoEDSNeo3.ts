import {
  Currency,
  ExchangeDataService,
  Network,
  NetworkType,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'

type FlamingoTokenInfoPricesResponse = {
  symbol: string
  usd_price: number
}[]

export class FlamingoEDSNeo3 implements ExchangeDataService {
  readonly networkType: NetworkType
  private axiosInstance: AxiosInstance

  constructor(networkType: NetworkType) {
    this.networkType = networkType
    this.axiosInstance = axios.create({ baseURL: 'https://api.flamingo.finance' })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (this.networkType !== 'mainnet') throw new Error('Exchange is only available on mainnet')

    const { data: prices } = await this.axiosInstance.get<FlamingoTokenInfoPricesResponse>('/token-info/prices')

    let currencyRatio: number = 1

    if (currency !== 'USD') {
      currencyRatio = await this.getCurrencyRatio(currency)
    }

    return prices.map(price => ({
      price: price.usd_price * currencyRatio,
      symbol: price.symbol,
    }))
  }

  private async getCurrencyRatio(currency: Currency): Promise<number> {
    const { data } = await this.axiosInstance.get<number>(`/fiat/exchange-rate?pair=USD_${currency}`)
    return data
  }
}
