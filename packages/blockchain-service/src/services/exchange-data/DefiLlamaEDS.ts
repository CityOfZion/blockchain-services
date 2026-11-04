import type {
  TGetTokenPriceHistoryParams,
  TGetTokenPricesParams,
  IExchangeDataService,
  TBSToken,
  TTokenPricesHistoryResponse,
  TTokenPricesResponse,
} from '../../interfaces'
import axios, { AxiosInstance } from 'axios'
import type { TDefiLlamaChartResponse, TDefiLlamaPricesResponse } from '../../types'

export class DefiLlamaEDS implements IExchangeDataService {
  #apiInstance?: AxiosInstance

  get #api() {
    if (!this.#apiInstance) {
      this.#apiInstance = axios.create({ baseURL: 'https://coins.llama.fi' })
    }

    return this.#apiInstance
  }

  protected _getDefiLlamaId(_token: TBSToken): string | undefined {
    return undefined
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    const response: TTokenPricesResponse[] = []
    const tokensById = new Map<string, TBSToken>()

    params.tokens.forEach(token => {
      const id = this._getDefiLlamaId(token)

      if (!id) return

      tokensById.set(id, token)
    })

    if (tokensById.size === 0) return response

    const ids = Array.from(tokensById.keys()).join(',')
    const { data } = await this.#api.get<TDefiLlamaPricesResponse>(`/prices/current/${ids}`)

    Object.entries(data.coins).forEach(([id, item]) => {
      const token = tokensById.get(id)

      if (!token || !item || item.price <= 0) return

      response.push({ usdPrice: item.price, token })
    })

    return response
  }

  async getTokenPriceHistory({ token }: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    const id = this._getDefiLlamaId(token)

    if (!id) return []

    const { data } = await this.#api.get<TDefiLlamaChartResponse>(`/chart/${id}`, {
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

  async getCurrencyRatio(currency: string) {
    const { data } = await axios.get<number>(
      `https://neo-api.b-cdn.net/flamingo/live-data/fiat-exchange-rate/USD_${currency}`
    )

    return data
  }
}
