import { ExchangeDataService, GetTokenPricesParams, TokenPricesResponse } from '../../interfaces'
import axios from 'axios'
import { CryptoCompareEDS } from './CryptoCompareEDS'
import { BSTokenHelper } from '../../helpers/BSTokenHelper'

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

  constructor() {
    super()
  }

  async getTokenPrices({ tokens }: GetTokenPricesParams): Promise<TokenPricesResponse[]> {
    const { data: flamingoData } =
      await this.#flamingoAxiosInstance.get<FlamingoTokenInfoPricesResponse>('/live-data/prices/latest')

    const prices: TokenPricesResponse[] = []
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')

    if (neoToken && !flamingoData.find(BSTokenHelper.predicate(neoToken)))
      flamingoData.forEach(item => {
        if (item.symbol === 'bNEO') flamingoData.push({ ...item, symbol: neoToken.symbol, hash: neoToken.hash })
      })

    flamingoData.forEach(item => {
      const token = tokens.find(BSTokenHelper.predicate(item))

      if (!token) return

      prices.push({ usdPrice: item.usd_price, token })
    })

    if (tokens.length > prices.length) {
      const { data: forthewinData } =
        await this.#forthewinAxiosInstance.get<ForthewinTokenInfoPricesResponse>('/mainnet/prices')

      Object.entries(forthewinData).forEach(([hash, usdPrice]) => {
        const hasPrice = !!prices.find(({ token }) => BSTokenHelper.predicate({ hash })(token))

        if (hasPrice) return

        const foundToken = tokens.find(BSTokenHelper.predicate({ hash }))

        if (!foundToken) return

        prices.push({ usdPrice, token: foundToken })
      })
    }

    return prices
  }
}
