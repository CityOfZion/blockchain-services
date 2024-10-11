import {
  ExchangeDataService,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from './interfaces'
import axios, { AxiosInstance } from 'axios'

type CryptoCompareDataResponse = {
  RAW: {
    [symbol: string]: {
      [currency: string]: {
        PRICE: number
      }
    }
  }
}

type CryptoCompareHistoryResponse = {
  Data: {
    time: number
    close: number
  }[]
}

export class CryptoCompareEDS implements ExchangeDataService {
  readonly #axiosInstance: AxiosInstance

  constructor() {
    this.#axiosInstance = axios.create({ baseURL: 'https://min-api.cryptocompare.com' })
  }

  async getTokenPrices(params: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    const { data: prices } = await this.#axiosInstance.get<CryptoCompareDataResponse>('/data/pricemultifull', {
      params: {
        fsyms: params.tokens.map(token => token.symbol).join(','),
        tsyms: 'USD',
      },
    })

    return Object.entries(prices.RAW).map(([symbol, priceObject]) => {
      const usdPrice = priceObject.USD.PRICE
      const token = params.tokens.find(token => token.symbol === symbol)!

      return {
        usdPrice,
        token,
      }
    })
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    const path = `/data/${params.type === 'hour' ? 'histohour' : 'histoday'}`

    const response = await this.#axiosInstance.get<CryptoCompareHistoryResponse>(path, {
      params: {
        fsym: params.token.symbol,
        tsym: 'USD',
        limit: params.limit,
      },
    })

    const history: TokenPricesHistoryResponse[] = []

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
