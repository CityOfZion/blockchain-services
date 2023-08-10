import { Currency, Exchange, Network, TokenPricesResponse } from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'

type FlamingoTokenInfoPricesResponse = {
  symbol: string
  usd_price: number
}[]

export class FlamingoExchange implements Exchange {
  readonly network: Network
  private axiosInstance: AxiosInstance

  constructor(network: Network) {
    this.network = network
    this.axiosInstance = axios.create({ baseURL: 'https://api.flamingo.finance' })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (this.network.type !== 'mainnet') throw new Error('Exchange is only available on mainnet')

    const { data: prices } = await this.axiosInstance.get<FlamingoTokenInfoPricesResponse>('/token-info/prices')

    let currencyRatio: number = 1

    if (currency !== 'USD') {
      const { data } = await this.axiosInstance.get<number>(`/fiat/exchange-rate?pair=USD_${currency}`)
      currencyRatio = data
    }

    return prices.map(price => ({
      amount: price.usd_price * currencyRatio,
      symbol: price.symbol,
    }))
  }
}
