import {
  BSCommonConstants,
  BSError,
  BSUtilsHelper,
  DefiLlamaCryptoCompareEDS,
  type IExchangeDataService,
  type TBSToken,
  type TGetTokenPriceHistoryParams,
  type TGetTokenPricesParams,
  type TTokenPricesHistoryResponse,
  type TTokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSSolanaConstants } from '../../constants/BSSolanaConstants'
import axios, { AxiosInstance } from 'axios'
import { sub } from 'date-fns/sub'
import type { IBSSolana } from '../../types'

type TMoralisTokenPricesResponse = {
  usdPrice: number
  pairAddress: string
}

type TMoralisTokenPriceHistoryResponse = {
  result: {
    timestamp: string
    close: number
  }[]
}

export class DefiLlamaCryptoCompareMoralisEDSSolana extends DefiLlamaCryptoCompareEDS implements IExchangeDataService {
  readonly #service: IBSSolana
  readonly #client: AxiosInstance

  #pairAddressCache: Map<string, string> = new Map()

  constructor(service: IBSSolana) {
    super()

    this.#service = service
    this.#client = axios.create({ baseURL: `${BSCommonConstants.COZ_API_URL}/v2/p/solana/price` })
  }

  protected _getDefiLlamaId({ hash }: TBSToken) {
    if (this.#service.tokenService.isNativeToken(hash)) {
      return `${this.#service.name}:${BSSolanaConstants.NATIVE_WRAPPED_HASH}`
    }

    return `${this.#service.name}:${hash}`
  }

  async getTokenPrices(params: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    let response: TTokenPricesResponse[] = []

    try {
      response = await super.getTokenPrices(params)
    } catch {
      /* empty */
    }

    const symbols = new Set(response.filter(({ usdPrice }) => usdPrice > 0).map(({ token }) => token.symbol))
    const missingTokens = params.tokens.filter(token => !symbols.has(token.symbol))

    if (missingTokens.length === 0) return response

    const promises = missingTokens.map(async token => {
      let usdPrice = 0

      const hash = this.#service.tokenService.isNativeToken(token.hash)
        ? BSSolanaConstants.NATIVE_WRAPPED_HASH
        : token.hash

      try {
        const { data } = await this.#client.get<TMoralisTokenPricesResponse>(`token/mainnet/${hash}/price`)

        usdPrice = data.usdPrice

        this.#pairAddressCache.set(token.hash, data.pairAddress)
      } catch {
        /* empty */
      }

      return { token, usdPrice }
    })

    const missingResponse = await Promise.all(promises)

    return [...response, ...missingResponse]
  }

  async getTokenPriceHistory(params: TGetTokenPriceHistoryParams): Promise<TTokenPricesHistoryResponse[]> {
    if (this.#service.network.type !== 'mainnet') {
      throw new BSError('Exchange is only available on Mainnet', 'ONLY_AVAILABLE_ON_MAINNET')
    }

    const [response] = await BSUtilsHelper.tryCatch(() => super.getTokenPriceHistory(params))

    if (!!response && response.length > 0) return response

    const tokenHash = this.#service.tokenService.isNativeToken(params.token.hash)
      ? BSSolanaConstants.NATIVE_WRAPPED_HASH
      : params.token.hash

    let pairAddress = this.#pairAddressCache.get(tokenHash)

    if (!pairAddress) {
      const { data } = await this.#client.get<TMoralisTokenPricesResponse>(`token/mainnet/${tokenHash}/price`)

      this.#pairAddressCache.set(tokenHash, data.pairAddress)

      pairAddress = data.pairAddress
    }

    const toDate = new Date()
    const { data } = await this.#client.get<TMoralisTokenPriceHistoryResponse>(
      `token/mainnet/pairs/${pairAddress}/ohlcv`,
      {
        params: {
          currency: 'usd',
          timeframe: '1h',
          limit: 24,
          fromDate: sub(toDate, { days: 1 }),
          toDate,
        },
      }
    )

    const timestamps = new Set<number>()

    return data.result
      .map<TTokenPricesHistoryResponse>(item => ({
        token: params.token,
        usdPrice: item.close,
        timestamp: new Date(item.timestamp).getTime(),
      }))
      .filter(({ timestamp }) => (timestamps.has(timestamp) ? false : timestamps.add(timestamp)))
  }
}
