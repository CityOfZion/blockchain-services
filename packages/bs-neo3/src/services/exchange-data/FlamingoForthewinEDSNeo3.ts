import {
  CryptoCompareEDS,
  ExchangeDataService,
  GetTokenPriceHistoryParams,
  GetTokenPricesParams,
  Network,
  TokenPricesHistoryResponse,
  TokenPricesResponse,
} from '@cityofzion/blockchain-service'
import axios, { AxiosInstance } from 'axios'
import { BSNeo3NetworkId } from '../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../helpers/BSNeo3Helper'

type FlamingoTokenInfoPricesResponse = {
  symbol: string
  usd_price: number
  hash: string
}[]

type ForthewinTokenInfoPricesResponse = {
  [key: string]: number
}

export class FlamingoForthewinEDSNeo3 extends CryptoCompareEDS implements ExchangeDataService {
  readonly #network: Network<BSNeo3NetworkId>
  readonly #flamingoAxiosInstance: AxiosInstance
  readonly #forthewinAxiosInstance: AxiosInstance

  constructor(network: Network<BSNeo3NetworkId>) {
    super()

    this.#network = network
    this.#flamingoAxiosInstance = axios.create({ baseURL: 'https://neo-api.b-cdn.net/flamingo' })
    this.#forthewinAxiosInstance = axios.create({ baseURL: 'https://api.forthewin.network' })
  }

  async getTokenPrices({ tokens }: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on Mainnet')

    const { data: flamingoData } =
      await this.#flamingoAxiosInstance.get<FlamingoTokenInfoPricesResponse>('/live-data/prices/latest')

    const prices: TokenPricesResponse[] = []

    const allTokens = BSNeo3Helper.getTokens(this.#network)
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')
    const bNeoTokenHash = BSNeo3Helper.normalizeHash(allTokens.find(({ symbol }) => symbol === 'bNEO')?.hash ?? '')

    if (neoToken)
      flamingoData.forEach(item => {
        if (bNeoTokenHash === BSNeo3Helper.normalizeHash(item.hash))
          flamingoData.push({ ...item, symbol: neoToken.symbol, hash: neoToken.hash })
      })

    flamingoData.forEach(item => {
      const token = tokens.find(
        ({ hash }) => BSNeo3Helper.normalizeHash(hash) === BSNeo3Helper.normalizeHash(item.hash)
      )

      if (!token) return

      prices.push({ usdPrice: item.usd_price, token })
    })

    if (tokens.length > prices.length) {
      const { data: forthewinData } =
        await this.#forthewinAxiosInstance.get<ForthewinTokenInfoPricesResponse>('/mainnet/prices')

      Object.entries(forthewinData).forEach(([hash, usdPrice]) => {
        hash = BSNeo3Helper.normalizeHash(hash)

        const hasPrice = !!prices.find(({ token }) => BSNeo3Helper.normalizeHash(token.hash) === hash)

        if (hasPrice) return

        const foundToken = tokens.find(token => BSNeo3Helper.normalizeHash(token.hash) === hash)

        if (!foundToken) return

        prices.push({ usdPrice, token: foundToken })
      })
    }

    return prices
  }

  async getTokenPriceHistory(params: GetTokenPriceHistoryParams): Promise<TokenPricesHistoryResponse[]> {
    if (!BSNeo3Helper.isMainnet(this.#network)) throw new Error('Exchange is only available on mainnet')
    return await super.getTokenPriceHistory(params)
  }
}
