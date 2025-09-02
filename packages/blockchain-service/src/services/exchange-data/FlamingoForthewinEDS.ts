import { ExchangeDataService, GetTokenPricesParams, ITokenService, TokenPricesResponse } from '../../interfaces'
import axios from 'axios'
import { CryptoCompareEDS } from './CryptoCompareEDS'

type FlamingoTokenInfoPricesResponse = {
  symbol: string
  usd_price: number
  hash: string
}[]

type ForthewinTokenInfoPricesResponse = {
  [key: string]: number
}

export class FlamingoForthewinEDS extends CryptoCompareEDS implements ExchangeDataService {
  readonly #flamingoAxiosInstance = axios.create({ baseURL: 'https://neo-api.b-cdn.net/flamingo' })
  readonly #forthewinAxiosInstance = axios.create({ baseURL: 'https://api.forthewin.network' })
  readonly #tokenService: ITokenService

  constructor(tokenService: ITokenService) {
    super()

    this.#tokenService = tokenService
  }

  async getTokenPrices({ tokens }: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    const { data: flamingoData } =
      await this.#flamingoAxiosInstance.get<FlamingoTokenInfoPricesResponse>('/live-data/prices/latest')

    const prices: TokenPricesResponse[] = []
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')

    if (neoToken && !flamingoData.find(this.#tokenService.predicate(neoToken)))
      flamingoData.forEach(item => {
        if (item.symbol === 'bNEO') flamingoData.push({ ...item, symbol: neoToken.symbol, hash: neoToken.hash })
      })

    flamingoData.forEach(item => {
      const token = tokens.find(this.#tokenService.predicate(item))

      if (!token) return

      prices.push({ usdPrice: item.usd_price, token })
    })

    if (tokens.length > prices.length) {
      const { data: forthewinData } =
        await this.#forthewinAxiosInstance.get<ForthewinTokenInfoPricesResponse>('/mainnet/prices')

      Object.entries(forthewinData).forEach(([hash, usdPrice]) => {
        const hasPrice = !!prices.find(({ token }) => this.#tokenService.predicate({ hash })(token))

        if (hasPrice) return

        const foundToken = tokens.find(this.#tokenService.predicate({ hash }))

        if (!foundToken) return

        prices.push({ usdPrice, token: foundToken })
      })
    }

    return prices
  }
}
