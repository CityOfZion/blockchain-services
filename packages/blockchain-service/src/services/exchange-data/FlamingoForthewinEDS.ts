import { TGetTokenPricesParams, IBlockchainService, IExchangeDataService, TTokenPricesResponse } from '../../interfaces'
import axios, { AxiosInstance } from 'axios'
import { CryptoCompareEDS } from './CryptoCompareEDS'
import {
  TFlamingoForthewinEDSFlamingoPricesApiResponse,
  TFlamingoForthewinEDSForthewinPricesApiResponse,
} from '../../types'

export class FlamingoForthewinEDS<N extends string> extends CryptoCompareEDS implements IExchangeDataService {
  readonly _service: IBlockchainService<N>

  #forthewinApiInstance?: AxiosInstance
  #flamingoApiInstance?: AxiosInstance

  constructor(service: IBlockchainService<N>) {
    super()

    this._service = service
  }

  get #forthewinApi() {
    if (!this.#forthewinApiInstance) {
      this.#forthewinApiInstance = axios.create({ baseURL: 'https://api.forthewin.network' })
    }
    return this.#forthewinApiInstance
  }

  get #flamingoApi() {
    if (!this.#flamingoApiInstance) {
      this.#flamingoApiInstance = axios.create({ baseURL: 'https://neo-api.b-cdn.net/flamingo' })
    }
    return this.#flamingoApiInstance
  }

  async getTokenPrices({ tokens }: TGetTokenPricesParams): Promise<TTokenPricesResponse[]> {
    const { data: flamingoData } =
      await this.#flamingoApi.get<TFlamingoForthewinEDSFlamingoPricesApiResponse>('/live-data/prices/latest')

    const prices: TTokenPricesResponse[] = []
    const neoToken = tokens.find(({ symbol }) => symbol === 'NEO')

    if (neoToken && !flamingoData.find(token => this._service.tokenService.predicate(neoToken, token)))
      flamingoData.forEach(item => {
        if (item.symbol === 'bNEO') flamingoData.push({ ...item, symbol: neoToken.symbol, hash: neoToken.hash })
      })

    flamingoData.forEach(item => {
      const token = tokens.find(token => this._service.tokenService.predicate(item, token))

      if (!token) return

      prices.push({ usdPrice: item.usd_price, token })
    })

    if (tokens.length > prices.length) {
      const { data: forthewinData } =
        await this.#forthewinApi.get<TFlamingoForthewinEDSForthewinPricesApiResponse>('/mainnet/prices')

      Object.entries(forthewinData).forEach(([hash, usdPrice]) => {
        const hasPrice = !!prices.find(({ token }) => this._service.tokenService.predicate({ hash }, token))

        if (hasPrice) return

        const foundToken = tokens.find(token => this._service.tokenService.predicate({ hash }, token))

        if (!foundToken) return

        prices.push({ usdPrice, token: foundToken })
      })
    }

    return prices
  }
}
