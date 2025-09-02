import {
  CryptoCompareEDS,
  ExchangeDataService,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import { BSSolanaHelper } from '../../helpers/BSSolanaHelper'
import { BSSolanaConstants, BSSolanaNetworkId } from '../../constants/BSSolanaConstants'
import axios, { AxiosInstance } from 'axios'
import dayjs from 'dayjs'

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

export class MoralisEDSSolana extends CryptoCompareEDS implements ExchangeDataService {
  readonly #network: Network<BSSolanaNetworkId>
  readonly #client: AxiosInstance

  #pairAddressCache: Map<string, string> = new Map()

  constructor(network: Network<BSSolanaNetworkId>, apiKey: string) {
    super()

    this.#network = network
    this.#client = axios.create({
      baseURL: 'https://solana-gateway.moralis.io',
      headers: {
        'X-API-Key': apiKey,
      },
    })
  }

  async getTokenPrices({ tokens }: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSSolanaHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')

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

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    if (!BSSolanaHelper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')

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

    const toDate = dayjs().unix()
    const fromDate = dayjs().subtract(params.limit, params.type).unix()

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

    const pricesHistory = pricesHistoryResponse.data.result.map<TokenPricesHistoryResponse>(price => ({
      timestamp: dayjs(price.timestamp).unix(),
      token: params.token,
      usdPrice: price.close,
    }))

    return pricesHistory
  }
}
