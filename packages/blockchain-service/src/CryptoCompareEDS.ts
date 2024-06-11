import {
  Currency,
  ExchangeDataService,
  GetTokenPriceHistory,
  NetworkType,
  Token,
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
  networkType: NetworkType
  readonly #axiosInstance: AxiosInstance
  readonly #tokens: Token[]

  constructor(network: NetworkType, tokens: Token[] = []) {
    this.networkType = network
    this.#tokens = tokens
    this.#axiosInstance = axios.create({ baseURL: 'https://min-api.cryptocompare.com' })
  }

  async getTokenPrices(currency: Currency): Promise<TokenPricesResponse[]> {
    if (this.networkType !== 'mainnet') throw new Error('Exchange is only available on mainnet')

    const tokenSymbols = this.#tokens.map(token => token.symbol)
    const { data: prices } = await this.#axiosInstance.get<CryptoCompareDataResponse>('/data/pricemultifull', {
      params: {
        fsyms: tokenSymbols.join(','),
        tsyms: currency,
      },
    })

    return Object.entries(prices.RAW)
      .map(([symbol, priceObject]) => {
        const price = priceObject[currency].PRICE
        const token = this.#tokens.find(token => token.symbol === symbol)
        if (!token || !price) return

        return {
          symbol,
          price,
          hash: token?.hash,
        }
      })
      .filter((price): price is TokenPricesResponse => price !== undefined)
  }

  async getTokenPriceHistory(params: GetTokenPriceHistory): Promise<TokenPricesHistoryResponse[]> {
    const path = `/data/${params.type === 'hour' ? 'histohour' : 'histoday'}`
    const response = await this.#axiosInstance.get<CryptoCompareHistoryResponse>(path, {
      params: {
        fsym: params.tokenSymbol,
        tsym: params.currency,
        limit: params.limit,
      },
    })

    const history: TokenPricesHistoryResponse[] = []

    response.data.Data.forEach(data => {
      const token = this.#tokens.find(token => token.symbol === params.tokenSymbol)
      if (!token) return

      history.push({
        price: data.close,
        timestamp: data.time,
        symbol: params.tokenSymbol,
        hash: token.hash,
      })
    })

    return history
  }
}
