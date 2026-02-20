import {
  BSCommonConstants,
  CryptoCompareEDS,
  TGetTokenPriceHistoryParams,
  TGetTokenPricesParams,
  TTokenPricesHistoryResponse,
  TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSSolanaConstants } from '../../constants/BSSolanaConstants'
import axios, { AxiosInstance } from 'axios'
import { sub } from 'date-fns/sub'
import { IBSSolana } from '../../types'

type MoralisGetPriceResponse = {
  usdPrice: number
  pairAddress: string
}

type MoralisGetPriceHistoryResponse = {
  result: {
    timestamp: string
    close: number
  }[]
}

export class MoralisEDSSolana<N extends string> extends CryptoCompareEDS {
  readonly #client: AxiosInstance
  readonly #service: IBSSolana<N>

  #pairAddressCache: Map<string, string> = new Map()

  constructor(service: IBSSolana<N>) {
    super()

    this.#service = service
    this.#client = axios.create({
      baseURL: `${BSCommonConstants.COZ_API_URL}/api/v2/solana/price`,
    })
  }

  async getTokenPrices({ tokens }: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this.#service.network.type !== 'mainnet') throw new Error('Exchange is only available on mainnet')

    const promises = tokens.map(async token => {
      const hash =
        token.hash === BSSolanaConstants.NATIVE_TOKEN.hash ? BSSolanaConstants.NATIVE_WRAPPED_HASH : token.hash

      let usdPrice = 0
      try {
        const priceResponse = await this.#client.get<MoralisGetPriceResponse>(`token/mainnet/${hash}/price`)
        usdPrice = priceResponse.data.usdPrice
        this.#pairAddressCache.set(token.hash, priceResponse.data.pairAddress)
      } catch {
        /* empty */
      }

      return {
        token,
        usdPrice,
      }
    })

    return await Promise.all(promises)
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (this.#service.network.type !== 'mainnet') throw new Error('Exchange is only available on mainnet')

    const tokenHash =
      params.token.hash === BSSolanaConstants.NATIVE_TOKEN.hash
        ? BSSolanaConstants.NATIVE_WRAPPED_HASH
        : params.token.hash

    let pairAddress = this.#pairAddressCache.get(tokenHash)

    if (!pairAddress) {
      const priceResponse = await this.#client.get<MoralisGetPriceResponse>(`token/mainnet/${tokenHash}/price`)
      this.#pairAddressCache.set(tokenHash, priceResponse.data.pairAddress)
      pairAddress = priceResponse.data.pairAddress
    }

    const toDate = new Date()
    const fromDate = sub(toDate, {
      [params.type === 'day' ? 'days' : 'hours']: params.limit,
    })

    const pricesHistoryResponse = await this.#client.get<MoralisGetPriceHistoryResponse>(
      `token/mainnet/pairs/${pairAddress}/ohlcv`,
      {
        params: {
          timeframe: params.type === 'day' ? '1d' : '1h',
          currency: 'usd',
          limit: params.limit,
          toDate,
          fromDate,
        },
      }
    )

    const pricesHistory = pricesHistoryResponse.data.result.map<TTokenPricesHistoryResponse>(price => ({
      timestamp: new Date(price.timestamp).getTime(),
      token: params.token,
      usdPrice: price.close,
    }))

    return pricesHistory
  }
}
