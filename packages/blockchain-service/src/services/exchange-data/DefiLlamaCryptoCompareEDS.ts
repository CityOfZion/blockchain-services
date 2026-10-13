import type {
  TGetTokenPriceHistoryParams,
  TGetTokenPricesParams,
  IExchangeDataService,
  TBSToken,
  TTokenPricesHistoryResponse,
  TTokenPricesResponse,
} from '../../interfaces'
import axios, { AxiosInstance } from 'axios'
import type {
  TCryptoCompareDataResponse,
  TCryptoCompareHistoryResponse,
  TDefiLlamaChartResponse,
  TDefiLlamaPricesResponse,
} from '../../types'

export class DefiLlamaCryptoCompareEDS implements IExchangeDataService {
  #defiLlamaApiInstance?: AxiosInstance
  #cryptoCompareApiInstance?: AxiosInstance

  get #defiLlamaApi() {
    if (!this.#defiLlamaApiInstance) {
      this.#defiLlamaApiInstance = axios.create({ baseURL: 'https://coins.llama.fi' })
    }

    return this.#defiLlamaApiInstance
  }

  get #cryptoCompareApi() {
    if (!this.#cryptoCompareApiInstance) {
      this.#cryptoCompareApiInstance = axios.create({ baseURL: 'https://min-api.cryptocompare.com' })
    }

    return this.#cryptoCompareApiInstance
  }

  async #getDefiLlamaTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    const response: TTokenPricesResponse[] = []
    const tokensById = new Map<string, TBSToken>()

    params.tokens.forEach(token => {
      const id = this._getDefiLlamaId(token)

      if (!id) return

      tokensById.set(id, token)
    })

    if (tokensById.size === 0) return response

    const ids = Array.from(tokensById.keys()).join(',')
    const { data } = await this.#defiLlamaApi.get<TDefiLlamaPricesResponse>(`/prices/current/${ids}`)

    Object.entries(data.coins).forEach(([id, item]) => {
      const token = tokensById.get(id)

      if (!token || !item || item.price <= 0) return

      response.push({ usdPrice: item.price, token })
    })

    return response
  }

  async #getDefiLlamaTokenPriceHistory({ token }: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    const id = this._getDefiLlamaId(token)

    if (!id) return []

    const { data } = await this.#defiLlamaApi.get<TDefiLlamaChartResponse>(`/chart/${id}`, {
      params: {
        period: '1h',
        span: 24,
      },
    })

    const prices = data.coins[id]?.prices || []
    const timestamps = new Set<number>()

    return prices
      .map(({ price, timestamp }) => ({
        token,
        usdPrice: price,
        timestamp,
      }))
      .filter(({ timestamp }) => (timestamps.has(timestamp) ? false : timestamps.add(timestamp)))
  }

  async #getCryptoCompareTokenPrices({ tokens }: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    const response: TTokenPricesResponse[] = []
    const { data } = await this.#cryptoCompareApi.get<TCryptoCompareDataResponse>('/data/pricemultifull', {
      params: {
        fsyms: tokens.map(token => token.symbol).join(','),
        tsyms: 'USD',
      },
    })

    Object.entries(data.RAW).forEach(([symbol, item]) => {
      const token = tokens.find(tokenItem => tokenItem.symbol === symbol)

      if (token) {
        response.push({ usdPrice: item.USD.PRICE, token })
      }
    })

    return response
  }

  async #getCryptoCompareTokenPriceHistory({
    token,
  }: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    const response = await this.#cryptoCompareApi.get<TCryptoCompareHistoryResponse>('/data/histohour', {
      params: {
        fsym: token.symbol,
        tsym: 'USD',
        limit: 24,
      },
    })

    const timestamps = new Set<number>()

    return response.data.Data.map(data => ({
      token,
      usdPrice: data.close,
      timestamp: data.time,
    })).filter(({ timestamp }) => (timestamps.has(timestamp) ? false : timestamps.add(timestamp)))
  }

  protected _getDefiLlamaId(_token: TBSToken): string | undefined {
    return undefined
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    let response: TTokenPricesResponse[] = []

    try {
      response = await this.#getDefiLlamaTokenPrices(params)
    } catch {
      /* empty */
    }

    const symbols = new Set(response.filter(({ usdPrice }) => usdPrice > 0).map(({ token }) => token.symbol))
    const missingTokens = params.tokens.filter(token => !symbols.has(token.symbol))

    if (missingTokens.length === 0) return response

    try {
      const newResponse = await this.#getCryptoCompareTokenPrices({ ...params, tokens: missingTokens })

      response.push(...newResponse)
    } catch {
      /* empty */
    }

    return response
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    let response: TTokenPricesHistoryResponse[] = []

    try {
      response = await this.#getDefiLlamaTokenPriceHistory(params)
    } catch {
      /* empty */
    }

    if (response.length > 0) return response

    try {
      response = await this.#getCryptoCompareTokenPriceHistory(params)
    } catch {
      /* empty */
    }

    return response
  }

  async getCurrencyRatio(currency: string) {
    const { data } = await axios.get<number>(
      `https://neo-api.b-cdn.net/flamingo/live-data/fiat-exchange-rate/USD_${currency}`
    )

    return data
  }
}
