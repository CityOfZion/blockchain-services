import type {
  TGetTokenPriceHistoryParams,
  TGetTokenPricesParams,
  IExchangeDataService,
  TTokenPricesHistoryResponse,
  TTokenPricesResponse,
} from '../../interfaces'
import axios, { AxiosInstance } from 'axios'
import type { TCryptoCompareEDSDataResponse, TCryptoCompareEDSHistoryResponse } from '../../types'

export class CryptoCompareEDS implements IExchangeDataService {
  #apiInstance?: AxiosInstance

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = axios.create({ baseURL: 'https://min-api.cryptocompare.com' })
    }
    return this.#apiInstance
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    const { data: prices } = await this.#api.get<TCryptoCompareEDSDataResponse>('/data/pricemultifull', {
      params: {
        fsyms: params.tokens.map(token => token.symbol).join(','),
        tsyms: 'USD',
      },
    })

    return Object.entries(prices.RAW).map(([symbol, priceObject]) => {
      const usdPrice = priceObject.USD.PRICE
      const token = params.tokens.find(token => token.symbol === symbol)!

      return { usdPrice, token }
    })
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    const path = `/data/${params.type === 'hour' ? 'histohour' : 'histoday'}`

    const response = await this.#api.get<TCryptoCompareEDSHistoryResponse>(path, {
      params: {
        fsym: params.token.symbol,
        tsym: 'USD',
        limit: params.limit,
      },
    })

    const history: TTokenPricesHistoryResponse[] = []

    response.data.Data.forEach(data => {
      history.push({
        usdPrice: data.close,
        timestamp: data.time,
        token: params.token,
      })
    })

    return history
  }

  async getCurrencyRatio(currency: string): Promise<number> {
    const { data } = await axios.get<number>(
      `https://neo-api.b-cdn.net/flamingo/live-data/fiat-exchange-rate/USD_${currency}`
    )

    return data
  }
}
